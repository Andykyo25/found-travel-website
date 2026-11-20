import Link from "next/link";
import type { NewsBlock, NewsLink, NewsMethod, NewsRoute } from "@/lib/news";
import type { Trip } from "@/lib/site-content";
import { findTripByPathKey, formatPrice, tripPath } from "@/lib/trip-values";
import styles from "@/app/news/news.module.css";
import { TravelImage } from "./TravelImage";

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

// 團型卡：照片用第一個行程的封面，下方列出本站行程與目前起價；找不到的行程（已下架）直接略過。
function RouteCard({ route, index, trips }: { route: NewsRoute; index: number; trips: Trip[] }) {
  const linked = route.trips
    .map((key) => findTripByPathKey(trips, key))
    .filter((trip): trip is Trip => Boolean(trip));
  const cover = linked[0];

  return (
    <article className={`${styles.route}${cover ? "" : ` ${styles.routeNoMedia}`}`} data-rv>
      {cover ? (
        <Link className={styles.routeMedia} href={tripPath(cover)} tabIndex={-1} aria-hidden="true">
          <TravelImage src={cover.image} alt="" sizes="(max-width: 760px) 100vw, 360px" />
          <span className="fh-marks" aria-hidden="true"><b /><b /><b /><b /></span>
          <span className={styles.routeArea}>{route.area}</span>
        </Link>
      ) : null}
      <div className={styles.routeCopy}>
        <p className={styles.routeNo} aria-hidden="true">{String(index + 1).padStart(2, "0")}</p>
        <h3>
          {route.name}
          <span className={styles.badge}>{route.offer}</span>
        </h3>
        <p className={styles.routeText}>{route.text}</p>
        <ul className={styles.routeTags} aria-label={`${route.name}亮點`}>
          {route.highlights.map((item) => <li key={item}>{item}</li>)}
        </ul>
        {linked.length > 0 ? (
          <ul className={styles.routeTrips} aria-label={`${route.name}行程`}>
            {linked.map((trip) => (
              <li key={trip.id}>
                <Link href={tripPath(trip)}>
                  <strong>{trip.title}</strong>
                  <span>{formatPrice(trip.price, true)}</span>
                  <i aria-hidden="true">→</i>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

function BlockBody({ block, trips }: { block: NewsBlock; trips: Trip[] }) {
  switch (block.kind) {
    case "routes":
      return (
        <>
          <p className={styles.blockLede}>{block.lede}</p>
          <div className={styles.routes}>
            {block.items.map((route, index) => <RouteCard key={route.name} route={route} index={index} trips={trips} />)}
          </div>
        </>
      );
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

export function NewsBlocks({ blocks, trips }: { blocks: NewsBlock[]; trips: Trip[] }) {
  return blocks.map((block) => (
    <section className={styles.block} id={block.id} key={block.id} aria-labelledby={`${block.id}-title`}>
      <h2 id={`${block.id}-title`}>{block.title}</h2>
      <BlockBody block={block} trips={trips} />
    </section>
  ));
}
