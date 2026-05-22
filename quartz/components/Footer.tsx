import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/footer.scss"
import { version } from "../../package.json"
import { i18n } from "../i18n"
import { joinSegments, pathToRoot, type FullSlug } from "../util/path"

interface Options {
  links: Record<string, string>
}

const FooterIcon = ({ name }: { name: string }) => {
  switch (name) {
    case "GitHub":
      return (
        <svg class="footer-link-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M12 2.25c-5.39 0-9.75 4.37-9.75 9.75 0 4.31 2.8 7.96 6.68 9.25.49.09.67-.21.67-.47v-1.81c-2.72.59-3.29-1.16-3.29-1.16-.44-1.13-1.08-1.43-1.08-1.43-.89-.6.07-.59.07-.59.98.07 1.49 1 1.49 1 .87 1.48 2.28 1.05 2.83.8.09-.63.34-1.05.62-1.29-2.17-.25-4.45-1.08-4.45-4.82 0-1.07.38-1.94 1-2.62-.1-.25-.44-1.24.1-2.58 0 0 .82-.26 2.68 1 .78-.22 1.61-.33 2.44-.33.82 0 1.66.11 2.44.33 1.86-1.26 2.67-1 2.67-1 .54 1.34.2 2.33.1 2.58.62.68 1 1.55 1 2.62 0 3.75-2.28 4.57-4.46 4.81.35.31.66.9.66 1.82v2.7c0 .26.18.57.67.47A9.76 9.76 0 0 0 21.75 12c0-5.38-4.36-9.75-9.75-9.75z"
          />
        </svg>
      )
    case "WeChat":
      return (
        <svg class="footer-link-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M9.1 5.1c-3.64 0-6.6 2.45-6.6 5.48 0 1.7.94 3.22 2.41 4.22l-.56 1.69 1.97-.98c.82.35 1.76.54 2.78.54.22 0 .43-.01.64-.03a5.49 5.49 0 0 1-.29-1.76c0-3.09 2.95-5.59 6.57-5.59.18 0 .36.01.54.02-.91-2.1-3.78-3.59-7.46-3.59zm-2.24 4.1a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm4.48 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm4.68.72c-2.98 0-5.39 1.94-5.39 4.34s2.41 4.34 5.39 4.34c.76 0 1.48-.13 2.13-.36l1.69.84-.46-1.38c1.27-.8 2.03-2.04 2.03-3.43 0-2.4-2.41-4.34-5.39-4.34zm-1.8 3.32a.76.76 0 1 1 0 1.52.76.76 0 0 1 0-1.52zm3.62 0a.76.76 0 1 1 0 1.52.76.76 0 0 1 0-1.52z"
          />
        </svg>
      )
    case "Email":
      return (
        <svg class="footer-link-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M4.75 6.75h14.5v10.5H4.75z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
          <path
            d="m5.2 7.15 6.8 5.35 6.8-5.35"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      )
    default:
      return null
  }
}

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ displayClass, cfg, fileData }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    const links = opts?.links ?? []
    const baseDir = pathToRoot((fileData.slug ?? "index") as FullSlug)
    const wechatQrSrc = joinSegments(baseDir, "static/wechat-qr.png")
    return (
      <footer class={`${displayClass ?? ""}`}>
        <p>
          {i18n(cfg.locale).components.footer.createdWith}{" "}
          <a href="https://quartz.jzhao.xyz/">Quartz v{version}</a> © {year}
        </p>
        <ul>
          {Object.entries(links).map(([text, link]) => (
            <li key={text}>
              {link === "#wechat" ? (
                <span class="wechat-link-wrapper">
                  <a href="#" class="wechat-trigger footer-link" aria-label="WeChat">
                    <FooterIcon name={text} />
                    <span>{text}</span>
                  </a>
                  <span class="wechat-popover">
                    <img src={wechatQrSrc} alt="WeChat QR" class="wechat-popover-img" />
                    <p class="wechat-popover-hint">添加请注明来意</p>
                  </span>
                </span>
              ) : (
                <a href={link} class="footer-link">
                  <FooterIcon name={text} />
                  <span>{text}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      </footer>
    )
  }

  Footer.css = style
  return Footer
}) satisfies QuartzComponentConstructor
