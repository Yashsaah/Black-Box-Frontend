import { Link, useParams } from "react-router-dom";
import Plot from "../components/Plot";
import { Reveal } from "../components/Layout";
import { projects } from "../data/content";

export default function ProjectDetail() {
  const { slug } = useParams();
  const p = projects.find((x) => x.slug === slug);

  if (!p) {
    return (
      <section className="band shell">
        <p className="eyebrow">404</p>
        <h1 className="display">No project at that address</h1>
        <p className="lede">The link may be old. The full list is one click away.</p>
        <p style={{ marginTop: 24 }}>
          <Link to="/projects" className="back">← All projects</Link>
        </p>
      </section>
    );
  }

  return (
    <article className="band shell">
      <Link to="/projects" className="back">← All projects</Link>

      <header style={{ marginTop: 28, maxWidth: "44ch" }}>
        <span className="tag" style={{ "--pen": p.pen }}>{p.tag}</span>
        <h1 className="display display--xs" style={{ marginTop: 12 }}>{p.title}</h1>
      </header>
      <p className="lede">{p.summary}</p>

      <dl className="spec" style={{ marginTop: 40 }}>
        {p.spec.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div>
          <dt>Entry</dt>
          <dd>{p.entry}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{p.status}</dd>
        </div>
      </dl>

      <Reveal variant="fade">
        <figure className="figure">
          <Plot curves={p.curves} />
          <figcaption>{p.curves.caption}</figcaption>
        </figure>
      </Reveal>

      <div className="prose prose--wide">
        {p.sections.map((s, i) => (
          <Reveal key={s.heading} variant="rise" delay={i * 60}>
            <section className={`entry ${s.curves ? "entry--split" : ""}`}>
              <div className="entry__text">
                <h2>{s.heading}</h2>
                <p>{s.body}</p>
              </div>
              {s.curves && (
                <figure className="figure entry__fig">
                  <Plot curves={s.curves} />
                  <figcaption>{s.curves.caption}</figcaption>
                </figure>
              )}
            </section>
          </Reveal>
        ))}
      </div>
    </article>
  );
}
