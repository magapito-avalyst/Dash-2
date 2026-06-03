import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const RD_TOKEN_URL = 'https://api.rd.services/auth/token?token_by=code'

type TokenPayload = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function pageShell(title: string, body: string) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; background: #eff3f4; color: #0f172a; font-family: Arial, sans-serif; }
      main { max-width: 860px; margin: 48px auto; background: #fff; border: 1px solid #d8dee3; border-radius: 10px; padding: 28px; box-shadow: 0 1px 3px rgba(15, 23, 42, .08); }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p { line-height: 1.55; color: #475569; }
      label { display: block; margin: 18px 0 8px; font-weight: 700; }
      textarea, input { box-sizing: border-box; width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font: 14px ui-monospace, SFMono-Regular, Consolas, monospace; color: #0f172a; }
      textarea { min-height: 180px; resize: vertical; }
      code { background: #f1f5f9; border-radius: 4px; padding: 2px 5px; }
      .note { border: 1px solid #f2cc8f; background: #fff7ed; color: #7c2d12; border-radius: 8px; padding: 12px; }
    </style>
  </head>
  <body>
    <main>${body}</main>
  </body>
</html>`
}

async function readJsonOrText(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function GET(request: NextRequest) {
  const clientId = process.env.RD_STATION_CLIENT_ID
  const clientSecret = process.env.RD_STATION_CLIENT_SECRET
  const setupSecret = process.env.RD_STATION_OAUTH_SETUP_SECRET
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')

  if (!clientId || !clientSecret) {
    return htmlResponse(
      pageShell(
        'RD Station OAuth pendente',
        '<h1>Credenciais OAuth pendentes</h1><p>Defina <code>RD_STATION_CLIENT_ID</code> e <code>RD_STATION_CLIENT_SECRET</code> na Vercel antes de concluir a autorizacao.</p>'
      ),
      428
    )
  }

  if (setupSecret && state !== setupSecret) {
    return htmlResponse(
      pageShell(
        'RD Station OAuth bloqueado',
        '<h1>State invalido</h1><p>O parametro <code>state</code> recebido nao confere com <code>RD_STATION_OAUTH_SETUP_SECRET</code>.</p>'
      ),
      401
    )
  }

  if (!code) {
    return htmlResponse(
      pageShell(
        'RD Station OAuth sem code',
        '<h1>Code nao recebido</h1><p>A RD Station nao enviou o parametro <code>code</code>. Recomece a autorizacao pela rota <code>/api/rd-station/oauth/start</code>.</p>'
      ),
      400
    )
  }

  const response = await fetch(RD_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
    cache: 'no-store',
  })
  const payload = await readJsonOrText(response)

  if (!response.ok || typeof payload !== 'object' || payload === null) {
    return htmlResponse(
      pageShell(
        'RD Station OAuth erro',
        `<h1>Erro ao obter tokens</h1><p>A RD Station recusou a troca do code por tokens.</p><label>Resposta da RD</label><textarea readonly>${escapeHtml(JSON.stringify(payload, null, 2))}</textarea>`
      ),
      response.status || 502
    )
  }

  const tokenPayload = payload as TokenPayload

  if (!tokenPayload.refresh_token || !tokenPayload.access_token) {
    return htmlResponse(
      pageShell(
        'RD Station OAuth incompleto',
        `<h1>Tokens incompletos</h1><p>A resposta nao trouxe <code>access_token</code> e <code>refresh_token</code>.</p><label>Resposta da RD</label><textarea readonly>${escapeHtml(JSON.stringify(payload, null, 2))}</textarea>`
      ),
      502
    )
  }

  const envBlock = [
    `RD_STATION_CLIENT_ID=${clientId}`,
    'RD_STATION_CLIENT_SECRET=<mantenha-o mesmo valor configurado na Vercel>',
    `RD_STATION_REFRESH_TOKEN=${tokenPayload.refresh_token}`,
    `RD_STATION_ACCESS_TOKEN=${tokenPayload.access_token}`,
  ].join('\n')

  return htmlResponse(
    pageShell(
      'RD Station OAuth concluido',
      `<h1>RD Station autorizada</h1>
      <p>Copie o bloco abaixo para as variaveis de ambiente da Vercel. O <code>access_token</code> expira em ${escapeHtml(String(tokenPayload.expires_in || 86400))} segundos; o importante para manter a integracao viva e o <code>refresh_token</code>.</p>
      <div class="note">Guarde estes valores como segredo. Nao publique em commit, print ou chat publico.</div>
      <label>Variaveis para Vercel</label>
      <textarea readonly>${escapeHtml(envBlock)}</textarea>
      <p>Depois de salvar as variaveis, faca um novo deploy da branch <code>main</code>.</p>`
    )
  )
}
