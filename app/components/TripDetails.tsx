import type { Trip } from "@/lib/site-content";
import { listLines } from "@/lib/trip-itinerary";

function SectionHead({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <div className="trip-plans-intro">
      <p className="eyebrow">
        <span />
        {eyebrow}
      </p>
      <h2>{title}</h2>
      {lede ? <p>{lede}</p> : null}
    </div>
  );
}

/** 每日行程與費用說明：放在方案與團期之前，旅客先看內容再選日期。 */
export function TripItinerary({ trip }: { trip: Pick<Trip, "itinerary" | "includes" | "excludes"> }) {
  const days = trip.itinerary ?? [];
  const includes = listLines(trip.includes);
  const excludes = listLines(trip.excludes);
  if (days.length === 0 && includes.length === 0 && excludes.length === 0) return null;

  return (
    <>
      {days.length > 0 ? (
        <section className="trip-plans-section trip-itinerary" id="itinerary">
          <SectionHead eyebrow="ITINERARY" title={`每日行程・${days.length} 天`} lede="實際航班時間與景點順序，以出發前說明會資料為準。" />
          <ol className="trip-days">
            {days.map((day, index) => (
              <li key={day.id} className="trip-day">
                <span className="trip-day-no">
                  DAY <b>{String(index + 1).padStart(2, "0")}</b>
                </span>
                <div className="trip-day-body">
                  <h3>{day.title || `第 ${index + 1} 天`}</h3>
                  {day.description ? <p>{day.description}</p> : null}
                  {day.meals || day.hotel ? (
                    <dl className="trip-day-facts">
                      {day.meals ? (
                        <div>
                          <dt>餐食</dt>
                          <dd>{day.meals}</dd>
                        </div>
                      ) : null}
                      {day.hotel ? (
                        <div>
                          <dt>住宿</dt>
                          <dd>{day.hotel}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {includes.length > 0 || excludes.length > 0 ? (
        <section className="trip-plans-section trip-costs" id="costs">
          <SectionHead eyebrow="WHAT'S INCLUDED" title="費用說明" />
          <div className="trip-cost-grid">
            {includes.length > 0 ? (
              <div>
                <h3>費用包含</h3>
                <ul>
                  {includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {excludes.length > 0 ? (
              <div className="is-excluded">
                <h3>費用不含</h3>
                <ul>
                  {excludes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}

/** 注意事項與常見問題：放在團期之後。 */
export function TripNotes({ trip }: { trip: Pick<Trip, "notes" | "faqs"> }) {
  const notes = listLines(trip.notes);
  const faqs = trip.faqs ?? [];
  if (notes.length === 0 && faqs.length === 0) return null;

  return (
    <>
      {notes.length > 0 ? (
        <section className="trip-departures-section trip-notes" id="notes">
          <SectionHead eyebrow="GOOD TO KNOW" title="注意事項" />
          <ul>
            {notes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {faqs.length > 0 ? (
        <section className="trip-departures-section trip-faq" id="faq">
          <SectionHead eyebrow="FAQ" title="常見問題" />
          <div className="trip-faq-list">
            {faqs.map((faq) => (
              <details key={faq.id}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
