import type { NewsBlock, NewsLink, NewsMethod } from "@/lib/news";
import styles from "@/app/news/news.module.css";

// 外部連結一律另開分頁，箭頭只是裝飾。
export function NewsExternalLink({ link }: { link: NewsLink }) {
  return (
    <a className={styles.textLink} href={link.href} target="_blank" rel="noopener noreferrer">
      {link.label} <span aria-hidden="true">↗</span>
    </a>
  );
}

function MethodCard({ method, index }: { method: NewsMethod; index: number }) {
  return (
    <article className={styles.method} data-rv>
      <header className={styles.methodHead}>
        <span className={styles.methodNo} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <div>
          <h3>
            {method.name}
            {method.badge ? <span className={styles.badge}>{method.badge}</span> : null}
          </h3>
          <p>{method.audience}</p>
        </div>
      </header>
      <ol className={styles.steps}>
        {method.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      {method.note ? <p className={styles.methodNote}>{method.note}</p> : null}
      {method.link ? <NewsExternalLink link={method.link} /> : null}
    </article>
  );
}

function BlockBody({ block }: { block: NewsBlock }) {
  switch (block.kind) {
    case "text":
      return <div className={styles.prose}>{block.paragraphs.map((text) => <p key={text}>{text}</p>)}</div>;
    case "facts":
      return (
        <dl className={styles.facts}>
          {block.items.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd className={styles.factValue}>{item.value}</dd>
              <dd className={styles.factNote}>{item.note}</dd>
            </div>
          ))}
        </dl>
      );
    case "compare":
      return (
        <table className={styles.compare}>
          <thead>
            <tr>
              <th scope="col"><span className={styles.srOnly}>項目</span></th>
              <th scope="col">{block.columns[0]}</th>
              <th scope="col">{block.columns[1]}</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td data-label={block.columns[0]}>{row.before}</td>
                <td data-label={block.columns[1]}>{row.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "methods":
      return (
        <>
          <p className={styles.blockLede}>{block.lede}</p>
          <div className={styles.methods}>
            {block.items.map((method, index) => <MethodCard key={method.name} method={method} index={index} />)}
          </div>
        </>
      );
    case "names":
      return (
        <>
          <p className={styles.blockLede}>{block.lede}</p>
          <ul className={styles.names}>
            {block.items.map((name) => <li key={name}>{name}</li>)}
          </ul>
          <p className={styles.note}>{block.note}</p>
        </>
      );
    case "tips":
      return (
        <ul className={styles.tips}>
          {block.items.map((tip) => (
            <li key={tip.title}>
              <h3>{tip.title}</h3>
              <p>{tip.text}</p>
            </li>
          ))}
        </ul>
      );
  }
}

export function NewsBlocks({ blocks }: { blocks: NewsBlock[] }) {
  return blocks.map((block) => (
    <section className={styles.block} id={block.id} key={block.id} aria-labelledby={`${block.id}-title`}>
      <h2 id={`${block.id}-title`}>{block.title}</h2>
      <BlockBody block={block} />
    </section>
  ));
}
