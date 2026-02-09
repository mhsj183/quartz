import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/footer.scss"
import { version } from "../../package.json"
import { i18n } from "../i18n"
import { joinSegments, pathToRoot } from "../util/path"

interface Options {
  links: Record<string, string>
}

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ displayClass, cfg, fileData }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    const links = opts?.links ?? []
    const baseDir = pathToRoot(fileData.slug ?? ("index" as const))
    const wechatQrSrc = joinSegments(baseDir, "static/wechat-qr.png")
    return (
      <footer class={`${displayClass ?? ""}`}>
        <p>
          {i18n(cfg.locale).components.footer.createdWith}{" "}
          <a href="https://quartz.jzhao.xyz/">Quartz v{version}</a> © {year}
        </p>
        <ul>
          {Object.entries(links).map(([text, link]) => (
            <li>
              {link === "#wechat" ? (
                <span class="wechat-link-wrapper">
                  <a href="#" class="wechat-trigger" aria-label="WeChat">{text}</a>
                  <span class="wechat-popover">
                    <img src={wechatQrSrc} alt="WeChat QR" class="wechat-popover-img" />
                    <p class="wechat-popover-hint">添加请注明注明来意</p>
                  </span>
                </span>
              ) : (
                <a href={link}>{text}</a>
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
