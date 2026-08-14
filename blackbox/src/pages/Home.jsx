import { Link } from "react-router-dom";
import BlackBoxFlow from "../components/BlackBoxFlow";
import LatentField from "../components/LatentField";
import ResearchFigure from "../components/ResearchFigure";
import SplitText from "../components/SplitText";
import { Reveal } from "../components/Layout";
import { cohort, incubate, research } from "../data/content";

export default function Home() {
  return (
    <>
      <section className="hero hero--cine">
        <div className="hero__viz hero__viz--full">
          <LatentField />
        </div>
        <div className="hero__scrim hero__scrim--cine" aria-hidden="true" />

        <div className="shell hero__copy">
          <p className="hero__kicker mono line__inner" style={{ "--i": 0 }}>
            <i aria-hidden="true" />
            Cohort 2026:
            <b>Team Black Box</b>
          </p>

          <a
            className="lockup line__inner"
            style={{ "--i": 1 }}
            href={incubate.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className="lockup__badge">
              <img src={incubate.logo} alt="" width="1080" height="1080" />
            </span>
            <span className="lockup__meta mono">
              Built at
              <b>incubatenepal.com ↗</b>
            </span>
          </a>

          <h1 className="hero__title line__inner" style={{ "--i": 2 }}>
            Incubate Nepal
          </h1>

          <p className="hero__phrase line__inner" style={{ "--i": 3 }}>
            Connecting young minds in Nepal to create and explore
          </p>

          <div className="hero__note">
            {incubate.blurb.map((p, i) => (
              <p className="line__inner" style={{ "--i": 4 + i }} key={i}>
                {p}
              </p>
            ))}
          </div>
        </div>

        <span className="hero__scrollcue mono" aria-hidden="true">
          <i />
          Scroll
        </span>
      </section>

      <section className="band flow-band">
        <div className="flow-band__copy">
          <Reveal variant="fade">
            <p className="eyebrow">{cohort.eyebrow}</p>
          </Reveal>
          <SplitText as="h2" className="display caps" text={cohort.title} />
          {cohort.intro.map((p, i) => (
            <Reveal key={i} variant="fade" delay={200 + i * 90}>
              <p className={i === 0 ? "lede" : "copy"}>{p}</p>
            </Reveal>
          ))}
        </div>

        <Reveal variant="fade" delay={180}>
          <BlackBoxFlow />
        </Reveal>
      </section>

      <section className="band shell" style={{ paddingTop: 0 }}>

        <div className="pillars">
          {research.map((r, i) => (
            <Reveal
              key={r.id}
              variant="rise"
              delay={i * 140}
              className="pillar"
              style={{ "--pen": r.pen }}
            >
              <div className="pillar__fig">
                <ResearchFigure id={r.id} />
              </div>
              <p className="pillar__label mono">{r.label}</p>
              <h3 className="display pillar__title">{r.title}</h3>
              <p className="pillar__body">{r.body}</p>
            </Reveal>
          ))}
        </div>

        <Reveal variant="fade" delay={240}>
          <p style={{ marginTop: 42 }}>
            <Link to="/projects" className="btn btn--solid">
              Read the writeups
              <span className="btn__go" aria-hidden="true">
                →
              </span>
            </Link>
          </p>
        </Reveal>
      </section>
    </>
  );
}
