import { connection } from "next/server";
import { formatPrice, loadDirections, pluralize } from "@/lib/catalog";
import CourseAsk from "./CourseAsk";

/** Direction list and the course chapters, built from the workbook on every request. */
export default async function Catalog() {
  await connection();
  const directions = await loadDirections();

  if (directions.length === 0) {
    return (
      <section className="list" id="directions" data-field-ink="dark">
        <h2 className="head">Курсы скоро появятся</h2>
      </section>
    );
  }

  return (
    <>
      <section className="list" id="directions" data-field-ink="dark">
        <h2 className="head" data-reveal>
          Направления обучения
        </h2>
        <ul>
          {directions.map((d) => {
            const n = d.courses.length;
            return (
              <li key={d.id} data-reveal>
                <a className="poster-line" href={`#${d.id}`}>
                  <span className="name display">{d.name}</span>
                  <span className="detail">
                    {n} {pluralize(n, "курс", "курса", "курсов")}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      {directions.map((d) => (
        <section
          key={d.id}
          id={d.id}
          className="chapter"
          style={{ "--field": d.field } as React.CSSProperties}
          data-field-ink="dark"
        >
          <h2 className="display" data-reveal>
            {d.name}
          </h2>
          <div className="chapter-body">
            {d.intro && (
              <p className="chapter-intro lead" data-reveal>
                {d.intro}
              </p>
            )}
            <ul className="courses">
              {d.courses.map((c) => (
                <li key={c.title} className="course" data-reveal>
                  <div className="course-top">
                    <h3>{c.title}</h3>
                    {c.price && <span className="price">от {formatPrice(c.price)} / мес</span>}
                  </div>
                  {c.description && <p>{c.description}</p>}
                  <div className="course-foot">
                    <span className="small">
                      {[c.duration, c.format, c.age].filter(Boolean).join(" · ")}
                    </span>
                    <CourseAsk title={c.title} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </>
  );
}
