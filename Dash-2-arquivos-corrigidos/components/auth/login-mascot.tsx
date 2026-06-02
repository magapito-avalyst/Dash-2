'use client'

type LoginMascotProps = {
  mode: 'idle' | 'email' | 'password'
  email: string
}

const stroke = '#3A5E77'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function LoginMascot({ mode, email }: LoginMascotProps) {
  const hasEmailText = email.length > 0
  const hasAtSign = email.includes('@')
  const isLookingAtEmail = mode === 'email'
  const isPasswordMode = mode === 'password'

  const gazeX = isLookingAtEmail ? clamp((email.length - 8) * 0.75, -8, 8) : 0
  const gazeY = isLookingAtEmail ? 4 : 0
  const faceX = gazeX * 0.25
  const faceY = gazeY * 0.35
  const eyeScale = hasAtSign ? 0.72 : hasEmailText ? 0.88 : 1
  const mouthPath = hasAtSign
    ? 'M88 94c0 8 5 15 12 15s12-7 12-15H88z'
    : hasEmailText
      ? 'M90 96c3 6 17 6 20 0'
      : 'M91 97c3 3 6 4 9 4s6-1 9-4'

  const leftArmTransform = isPasswordMode
    ? 'translate(0px, 0px) rotate(0deg)'
    : 'translate(-72px, 128px) rotate(-28deg)'
  const rightArmTransform = isPasswordMode
    ? 'translate(0px, 0px) rotate(0deg)'
    : 'translate(72px, 128px) rotate(28deg)'

  return (
    <div
      className="mx-auto mb-5 h-[190px] w-[190px] overflow-hidden rounded-full border-[2.5px] border-[#3A5E77] bg-[#A9DDF3] sm:h-[200px] sm:w-[200px]"
      aria-hidden="true"
    >
      <svg className="h-full w-full" viewBox="0 0 200 200">
        <defs>
          <clipPath id="login-mascot-circle-mask">
            <circle cx="100" cy="100" r="100" />
          </clipPath>
        </defs>

        <circle cx="100" cy="100" r="100" fill="#A9DDF3" />
        <g clipPath="url(#login-mascot-circle-mask)">
          <g className="body">
            <path
              d="M193.3 135.9c-5.8-8.4-15.5-13.9-26.5-13.9H151V72c0-27.6-22.4-50-50-50S51 44.4 51 72v50H32.1c-10.6 0-20 5.1-25.8 13v78h187v-77.1z"
              fill="#FFFFFF"
            />
            <path
              d="M193.3 135.9c-5.8-8.4-15.5-13.9-26.5-13.9H151V72c0-27.6-22.4-50-50-50S51 44.4 51 72v50H32.1c-10.6 0-20 5.1-25.8 13"
              fill="none"
              stroke={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
            <path
              d="M100 156.4c-22.9 0-43 11.1-54.1 27.7C61.5 194.1 80.1 200 100 200s38.5-5.8 54.1-15.9C143 167.5 122.9 156.4 100 156.4z"
              fill="#DDF1FA"
            />
          </g>

          <g className="transition-transform duration-500 ease-out" style={{ transform: `translate(${faceX}px, ${faceY}px)` }}>
            <g className="ear-left">
              <circle cx="47" cy="83" r="11.5" fill="#DDF1FA" stroke={stroke} strokeWidth="2.5" />
              <path
                d="M46.3 78.9c-2.3 0-4.1 1.9-4.1 4.1 0 2.3 1.9 4.1 4.1 4.1"
                fill="none"
                stroke={stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            </g>
            <g className="ear-right">
              <circle cx="155" cy="83" r="11.5" fill="#DDF1FA" stroke={stroke} strokeWidth="2.5" />
              <path
                d="M155.7 78.9c2.3 0 4.1 1.9 4.1 4.1 0 2.3-1.9 4.1-4.1 4.1"
                fill="none"
                stroke={stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            </g>

            <path
              d="M84.1 121.6c2.7 2.9 6.1 5.4 9.8 7.5l.9-4.5c2.9 2.5 6.3 4.8 10.2 6.5 0-1.9-.1-3.9-.2-5.8 3 1.2 6.2 2 9.7 2.5-.3-2.1-.7-4.1-1.2-6.1"
              fill="none"
              stroke={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
            <path
              d="M134.5 46v35.5c0 21.8-15.4 39.5-34.5 39.5S65.5 103.3 65.5 81.5V46"
              fill="#DDF1FA"
            />
            <path
              d="M81.5 27.9c1.7-4.1 5.5-8.3 11.2-11.8.9 2.6 1.8 5.1 2.7 7.7 3.2-4.3 8.6-8.3 16.3-11.2-.7 3.3-1.6 6.6-2.6 9.8 4.9-2.1 11.1-3.6 18.4-4.2-2.4 3.2-5 6.4-7.9 9.5"
              fill="#FFFFFF"
              stroke={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
            <g
              className="transition-transform duration-500 ease-out"
              style={{ transform: `translateY(${isLookingAtEmail ? -1 : 0}px)` }}
            >
              <path
                d="M63.6 55.1c6.2 5.6 13.4 10.6 21.3 14.7 2.1-2.8 4-5.6 5.8-8.5 4.5 3.8 9.6 7.3 15.1 10.3 1.2-3 2.3-6.1 3.3-9.2 4.1 2 8.4 3.8 13 5.2.5-3.3 1-6.7 1.3-10 4.9-.5 9.9-1.3 14.8-2.6"
                fill="#FFFFFF"
                stroke={stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            </g>

            <g
              className="transition-transform duration-300 ease-out"
              style={{
                transform: `translate(${gazeX}px, ${gazeY}px) scale(${eyeScale})`,
                transformOrigin: '100px 79px',
              }}
            >
              <circle cx="85.5" cy="78.5" r="3.5" fill={stroke} />
              <circle cx="84" cy="76" r="1" fill="#FFFFFF" />
              <circle cx="114.5" cy="78.5" r="3.5" fill={stroke} />
              <circle cx="113" cy="76" r="1" fill="#FFFFFF" />
            </g>

            <g
              className="transition-transform duration-300 ease-out"
              style={{ transform: `translate(${gazeX * 0.45}px, ${gazeY * 0.6}px)` }}
            >
              <path
                d="M97.7 79.9h4.7c1.9 0 3 2.2 1.9 3.7l-2.3 3.3c-.9 1.3-2.9 1.3-3.8 0l-2.3-3.3c-1.3-1.6-.2-3.7 1.8-3.7z"
                fill={stroke}
              />
              <path
                d={mouthPath}
                className="transition-all duration-300"
                fill={hasAtSign ? '#617E92' : 'none'}
                stroke={stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
              {hasAtSign && <path d="M101 94h7v2c0 1.1-.9 2-2 2h-3c-1.1 0-2-.9-2-2v-2z" fill="#FFFFFF" />}
            </g>
          </g>

          <g
            className="transition-transform duration-500 ease-out"
            style={{ transform: leftArmTransform, transformOrigin: '12px 140px' }}
          >
            <path
              d="M-10 135c28-25 60-43 94-54"
              fill="none"
              stroke="#FFFFFF"
              strokeLinecap="round"
              strokeWidth="23"
            />
            <path
              d="M-10 135c28-25 60-43 94-54"
              fill="none"
              stroke={stroke}
              strokeLinecap="round"
              strokeWidth="2.5"
            />
            <ellipse cx="79" cy="82" rx="18" ry="13" fill="#DDF1FA" stroke={stroke} strokeWidth="2.5" />
            <circle cx="71" cy="81" r="2" fill="#8BBDE0" />
            <circle cx="79" cy="77" r="2" fill="#8BBDE0" />
            <circle cx="87" cy="81" r="2" fill="#8BBDE0" />
          </g>

          <g
            className="transition-transform duration-500 ease-out"
            style={{ transform: rightArmTransform, transformOrigin: '188px 140px' }}
          >
            <path
              d="M210 135c-28-25-60-43-94-54"
              fill="none"
              stroke="#FFFFFF"
              strokeLinecap="round"
              strokeWidth="23"
            />
            <path
              d="M210 135c-28-25-60-43-94-54"
              fill="none"
              stroke={stroke}
              strokeLinecap="round"
              strokeWidth="2.5"
            />
            <ellipse cx="121" cy="82" rx="18" ry="13" fill="#DDF1FA" stroke={stroke} strokeWidth="2.5" />
            <circle cx="113" cy="81" r="2" fill="#8BBDE0" />
            <circle cx="121" cy="77" r="2" fill="#8BBDE0" />
            <circle cx="129" cy="81" r="2" fill="#8BBDE0" />
          </g>
        </g>
      </svg>
    </div>
  )
}
