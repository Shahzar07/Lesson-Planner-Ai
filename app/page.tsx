import Link from "next/link";
import Reveal from "@/components/Reveal";
import Hills from "@/components/Hills";
import AppMock from "@/components/AppMock";
import Faq from "@/components/Faq";

export default function Home() {
  return (
    <main className="overflow-clip">
      <Nav />
      <Hero />
      <TrustStrip />
      <Problem />
      <Solution />
      <Features />
      <Audience />
      <Samples />
      <FaqSection />
      <FinalCta />
      <Footer />
    </main>
  );
}

/* ------------------------------- nav ------------------------------- */

function Nav() {
  const links = [
    ["Home", "#top"],
    ["How it works", "#how"],
    ["Formats", "#formats"],
    ["Who it's for", "#who"],
    ["FAQ", "#faq"],
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <nav className="glass mx-auto flex h-14 max-w-6xl items-center gap-4 rounded-full border border-white/70 px-4 shadow-[0_8px_30px_-16px_rgb(10_16_22/.25)]">
        <Link href="#top" className="flex items-center gap-2 pr-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-[13px] font-bold text-lime">س</span>
          <span className="wordmark text-[16px]">Sabaq</span>
        </Link>
        <ul className="ml-auto hidden items-center gap-1 md:flex">
          {links.map(([label, href]) => (
            <li key={label}>
              <a href={href} className="rounded-full px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <Link href="/plan" className="btn btn-ink ml-auto h-9 px-4 text-[13px] md:ml-0">
          Open the planner
        </Link>
      </nav>
    </header>
  );
}

/* ------------------------------- hero ------------------------------ */

function Hero() {
  return (
    <section id="top" className="hero-sky relative pt-28 md:pt-32">
      <Hills className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px] w-full md:h-[560px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />

      <div className="relative mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/70 py-1 pl-1 pr-3.5 text-[12px] backdrop-blur">
            <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold text-ink">Free</span>
            <span className="font-medium text-muted">Cambridge · Sindh Board · Oxford · FBISE</span>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <h1 className="display mx-auto max-w-[19ch] text-balance text-center text-[42px] sm:text-[58px] md:text-[72px]">
            Lesson plans that pass inspection.
          </h1>
        </Reveal>

        <Reveal delay={120}>
          <p className="mx-auto mt-5 max-w-[50ch] text-balance text-center text-[15px] leading-relaxed text-muted md:text-[16.5px]">
            Sabaq writes a complete B.Ed-standard lesson plan in your school&rsquo;s exact
            format, in English or اردو, and then checks its own work against eleven
            quality rules before it hands it to you.
          </p>
        </Reveal>

        <Reveal delay={180}>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Link href="/plan" className="btn btn-lime px-6">
              Make a lesson plan
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a href="#how" className="btn btn-ghost px-5">See how it works</a>
          </div>
        </Reveal>

        <Reveal delay={260} className="mt-12 md:mt-16">
          <div className="mx-auto max-w-5xl">
            <AppMock />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------- trust strip -------------------------- */

function TrustStrip() {
  const items = [
    "B.Ed & ADE teaching practice",
    "Cambridge Primary → A Level",
    "Sindh Textbook Board",
    "Oxford University Press",
    "FBISE · AKU-EB",
  ];
  return (
    <section className="border-y border-line bg-white py-7">
      <div className="mx-auto max-w-6xl px-5">
        <p className="mb-5 text-center text-[11.5px] font-medium text-faint">
          Built around the formats and syllabi Pakistani teachers actually work from
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {items.map((t) => (
            <span key={t} className="display-sm text-[14px] text-[#9dadb9]">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- problem ----------------------------- */

function Problem() {
  return (
    <section className="bg-wash/50 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-2 md:gap-16">
        <Reveal>
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-faint">Sunday, 9:40 pm</span>
              <span className="rounded-full bg-[#fdeaea] px-2 py-0.5 text-[10px] font-semibold text-[#c0392b]">6 plans due</span>
            </div>
            <div className="space-y-2">
              {[
                ["Class VI · Science · Photosynthesis", "Not started"],
                ["Stage 4 · Maths · Equivalent fractions", "Not started"],
                ["اردو · جماعت ہفتم · اسم صفت", "Not started"],
                ["Class IX · Physics · Kinematics", "Half done"],
                ["Stage 7 · English · Persuasive writing", "Not started"],
              ].map(([t, s]) => (
                <div key={t} className="flex items-center gap-3 rounded-xl border border-line bg-wash/50 px-3 py-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e0a800]" />
                  <span className={`flex-1 truncate text-[12.5px] text-ink ${/[؀-ۿ]/.test(t) ? "urdu" : ""}`}>{t}</span>
                  <span className="shrink-0 text-[10.5px] text-faint">{s}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-dashed border-line px-3 py-2.5 text-center text-[11.5px] text-faint">
              Copying last year&rsquo;s file and changing the date again
            </div>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <span className="eyebrow">The real problem</span>
          <h2 className="display mt-3 text-[32px] md:text-[42px]">
            Too much paperwork.
            <br />
            Too little teaching.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            A full B.Ed-format plan takes forty minutes to write properly. Multiply that by
            five periods a day and the plan stops being a thinking tool and becomes a form
            to be filled before the supervisor&rsquo;s visit.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            So objectives get written as &ldquo;students will understand&hellip;&rdquo;, the timings never
            add up, differentiation says &ldquo;help weak students&rdquo;, and the plan gets handed
            back with red ink on it.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------- solution ---------------------------- */

function Solution() {
  return (
    <section id="how" className="py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-2 md:gap-16">
        <Reveal className="md:order-2">
          <div className="card overflow-hidden">
            <div className="border-b border-line bg-wash/50 px-4 py-2.5 text-[11px] font-semibold text-faint">
              The accuracy engine · runs on every plan
            </div>
            <div className="divide-y divide-line">
              {[
                ["Timings total the lesson duration", "40 of 40 minutes", true, 15],
                ["Every objective uses a measurable verb", "4 objectives checked", true, 15],
                ["Objectives carry condition and degree", "ABCD complete", true, 10],
                ["Bloom levels are spread, not flat", "3 levels, 2 at Apply+", true, 10],
                ["Procedure is script level", "6 stages with exact questions", true, 10],
                ["No invented page, chapter or code", "nothing fabricated", true, 10],
                ["Concrete support and extension", "add 1 more extension", false, 10],
              ].map(([label, detail, ok, w]) => (
                <div key={String(label)} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${ok ? "bg-emerald" : "bg-[#e0a800]"}`}>
                    {ok ? "✓" : "!"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium text-ink">{label}</div>
                    <div className="truncate text-[11px] text-faint">{detail}</div>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-faint">{String(w)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between bg-ink px-4 py-3">
              <span className="text-[12px] text-white/60">Score after repair pass</span>
              <span className="text-[18px] font-bold tracking-tight text-lime">96 / 100</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80} className="md:order-1">
          <span className="eyebrow">Our solution</span>
          <h2 className="display mt-3 text-[32px] md:text-[42px]">
            It marks its own
            <br />
            work first.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Most AI writes a plan that looks right. Sabaq writes the plan, then runs it
            through eleven checks that live in code, not in a prompt. Arithmetic decides
            whether the timings add up. A verb list decides whether &ldquo;understand&rdquo; slipped
            into an objective. A regular expression catches a page number you never gave it.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Anything that fails goes back to the model with only the failures attached, and
            the corrected plan has to score higher than the first one to replace it.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["11 checks", "Auto-repair pass", "Score shown to you", "Nothing hidden"].map((t) => (
              <span key={t} className="rounded-full border border-line bg-wash/60 px-3 py-1.5 text-[12px] font-medium text-muted">
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------- features ---------------------------- */

function Features() {
  return (
    <section id="formats" className="bg-wash/50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="text-center">
          <span className="eyebrow">Core features</span>
          <h2 className="display mx-auto mt-3 max-w-[16ch] text-[32px] md:text-[42px]">
            Structured, not generic.
          </h2>
          <p className="mx-auto mt-4 max-w-[50ch] text-balance text-[15px] leading-relaxed text-muted">
            Three things decide whether a plan is usable tomorrow morning: the format, the
            curriculum behind it, and whether anyone checked it.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Reveal delay={0}>
            <FeatureCard
              title="Your format, field for field"
              body="The B.Ed teaching-practice sheet and the Urdu سبقی خاکہ are reproduced exactly, down to the Supervisor Feedback block left blank for a signature."
            >
              <div className="space-y-1.5">
                {[
                  ["B.Ed Standard", "English", true],
                  ["سبقی خاکہ", "اردو", false],
                  ["Cambridge 5E", "English", false],
                ].map(([a, b, on]) => (
                  <div key={String(a)} className={`flex items-center justify-between rounded-lg border px-2.5 py-2 ${on ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
                    <span className={`text-[12px] font-semibold ${/[؀-ۿ]/.test(String(a)) ? "urdu" : ""}`}>{a}</span>
                    <span className={`text-[10.5px] ${on ? "text-white/60" : "text-faint"}`}>{b}</span>
                  </div>
                ))}
              </div>
            </FeatureCard>
          </Reveal>

          <Reveal delay={80}>
            <FeatureCard
              title="Knows the curriculum, not just the topic"
              body="Cambridge strands and command words. Sindh Board SLOs and exam stems. Oxford unit structure. Each one is a separate knowledge pack loaded only when you need it."
            >
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ["Cambridge", "Stage 1–A Level"],
                  ["Sindh Board", "Class I–XII"],
                  ["Oxford", "NOME, Countdown"],
                  ["FBISE", "National Curriculum"],
                ].map(([a, b]) => (
                  <div key={a} className="rounded-lg border border-line bg-white p-2">
                    <div className="text-[11.5px] font-semibold text-ink">{a}</div>
                    <div className="text-[9.5px] text-faint">{b}</div>
                  </div>
                ))}
              </div>
            </FeatureCard>
          </Reveal>

          <Reveal delay={160}>
            <FeatureCard
              title="Written for a real classroom"
              body="Forty-five students, fixed benches, chalk and a board. Low-resource mode forces every activity to work without power, printing or internet."
            >
              <div className="space-y-1.5">
                {[
                  ["Bottle caps as counters", "free"],
                  ["Number line in chalk", "2 min"],
                  ["Slates, all show together", "in room"],
                  ["Projector", "has fallback"],
                ].map(([a, b]) => (
                  <div key={a} className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-grass" />
                    <span className="flex-1 text-[11.5px] text-ink">{a}</span>
                    <span className="text-[9.5px] text-faint">{b}</span>
                  </div>
                ))}
              </div>
            </FeatureCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="card flex h-full flex-col p-5">
      <div className="mb-4 rounded-xl bg-wash/70 p-3">{children}</div>
      <h3 className="display-sm text-[17px]">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

/* ----------------------------- audience ---------------------------- */

function Audience() {
  const rows = [
    ["B.Ed & ADE trainees", "On teaching practice, where the format itself is being marked."],
    ["Cambridge subject teachers", "Stage 1 to A Level, with command words and success criteria built in."],
    ["Government school teachers", "Sindh Board syllabus, forty-five students, one blackboard."],
    ["Urdu & Sindhi medium staff", "A full سبقی خاکہ in proper academic Urdu, not a translation."],
    ["Heads & coordinators", "One house format across a department, with a quality score on every plan."],
  ];
  return (
    <section id="who" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">Who it&rsquo;s for</span>
              <h2 className="display mt-3 max-w-[18ch] text-[32px] md:text-[42px]">
                Built for teachers who still care about the lesson.
              </h2>
            </div>
            <p className="max-w-[34ch] text-[13.5px] leading-relaxed text-muted">
              Free, in English and Urdu, and usable on a phone between periods.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_1.1fr] md:gap-14">
          <Reveal>
            <div className="card overflow-hidden p-0">
              <div className="bg-gradient-to-br from-[#e8f3e2] to-[#d3e9c8] p-6">
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-grass-deep">
                  Today · Period 3
                </div>
                <div className="urdu text-[20px] font-bold leading-[2] text-ink">
                  سبق کے اختتام پر طلبہ دیے گئے پیراگراف میں سے کم از کم پانچ اسمِ صفت الگ کر کے لکھ سکیں گے۔
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10.5px] font-semibold text-grass-deep">Apply</span>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10.5px] font-semibold text-grass-deep">قابلِ پیمائش</span>
                </div>
              </div>
              <div className="p-4 text-[12.5px] leading-relaxed text-muted">
                A measurable Urdu objective with a condition and a success criterion, in the
                register a Pakistani B.Ed supervisor expects to read.
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <ul className="divide-y divide-line">
              {rows.map(([t, d], i) => (
                <li key={t} className="flex gap-5 py-4">
                  <span className="w-6 shrink-0 pt-0.5 text-[12px] font-bold tabular-nums text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="display-sm text-[16px]">{t}</div>
                    <div className="mt-0.5 text-[13px] leading-relaxed text-muted">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ samples ---------------------------- */

function Samples() {
  const quotes: [string, string, string][] = [
    [
      "Ask: “Where does the water in a puddle go after a hot day?” Listen for “it dries up” or “the sun takes it”. Steer toward the word evaporation and write it on the board with the Urdu gloss beside it.",
      "Procedure — Initiation Activity",
      "Class VI · General Science · The Water Cycle",
    ],
    [
      "Give the four learners on the front bench a half-completed fraction wall and a partner who has already matched three pairs. They complete the wall before attempting the comparison task.",
      "Differentiation — Support",
      "Stage 4 · Mathematics · Equivalent Fractions",
    ],
    [
      "سرگرمی نمبر ۲: طلبہ کو جوڑوں میں تقسیم کریں۔ ہر جوڑا دیے گئے پیراگراف سے پانچ اسمِ صفت تلاش کر کے تختۂِ سیاہ پر لکھے گا۔",
      "اہم اسباقی مدارج",
      "جماعت ہفتم · اردو · اسمِ صفت",
    ],
    [
      "Mini whiteboards, minute 22. Every learner writes one fraction equivalent to 2/3 and holds it up together. If more than six are wrong, reteach the multiplier rule before moving to the exercise.",
      "Assessment for Learning",
      "Stage 4 · Mathematics · Equivalent Fractions",
    ],
  ];

  return (
    <section className="bg-wash/50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="text-center">
          <span className="eyebrow">Straight from the output</span>
          <h2 className="display mx-auto mt-3 max-w-[20ch] text-[32px] md:text-[42px]">
            This is the level of detail you get.
          </h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-balance text-[15px] leading-relaxed text-muted">
            Not &ldquo;ask questions about the topic&rdquo;. The actual question, the answer to listen
            for, and what to do when the class does not give it.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {quotes.map(([q, section, meta], i) => {
            const isUrdu = /[؀-ۿ]/.test(q);
            return (
              <Reveal key={q} delay={i * 70}>
                <figure className="card flex h-full flex-col p-5">
                  <span className="mb-3 text-[26px] leading-none text-lime-2">&ldquo;</span>
                  <blockquote className={`flex-1 text-[14px] leading-relaxed text-ink ${isUrdu ? "urdu" : ""}`}>
                    {q}
                  </blockquote>
                  <figcaption className="mt-4 flex items-center gap-3 border-t border-line pt-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-wash text-[11px] font-bold text-grass-deep">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-semibold text-ink">{section}</div>
                      <div className="truncate text-[11px] text-faint">{meta}</div>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- faq ------------------------------ */

function FaqSection() {
  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mb-10 text-center">
          <span className="eyebrow">Frequently asked</span>
          <h2 className="display mx-auto mt-3 max-w-[20ch] text-[32px] md:text-[42px]">
            Everything you might be wondering.
          </h2>
        </Reveal>
        <Reveal delay={60}>
          <Faq />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------- cta ------------------------------- */

function FinalCta() {
  return (
    <section className="px-3 pb-3">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-ink px-6 py-14 md:px-14 md:py-20">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <span className="eyebrow !text-white/40">Takes about eight seconds</span>
            <h2 className="display mt-4 max-w-[16ch] text-[32px] text-white md:text-[44px]">
              Get your Sunday evening back.
            </h2>
          </div>
          <div className="md:pl-6">
            <p className="text-[14.5px] leading-relaxed text-white/60">
              Pick your curriculum, your class and your topic. Sabaq writes the full plan in
              your format, scores it against the rubric, fixes what failed, and gives you a
              sheet you can print for A4 or download as Word.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/plan" className="btn btn-lime px-6">
                Make a lesson plan
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a href="#how" className="btn h-11 border border-white/15 px-5 text-white/80 hover:bg-white/5">
                How the scoring works
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ footer ----------------------------- */

function Footer() {
  const cols: [string, string[]][] = [
    ["Product", ["The planner", "Formats", "Curricula", "Accuracy engine"]],
    ["Curricula", ["Cambridge", "Sindh Board", "Oxford Pakistan", "FBISE", "AKU-EB"]],
    ["Formats", ["B.Ed Standard", "سبقی خاکہ", "Cambridge 5E"]],
  ];
  return (
    <footer className="bg-ink pt-16 text-white">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-10 pb-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-lime text-[13px] font-bold text-ink">س</span>
              <span className="wordmark text-[16px]">Sabaq</span>
            </div>
            <p className="mt-3 max-w-[30ch] text-[13px] leading-relaxed text-white/45">
              Lesson planning built for Pakistani classrooms, in the format your supervisor
              is actually holding.
            </p>
          </div>
          {cols.map(([title, items]) => (
            <div key={title}>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">{title}</div>
              <ul className="space-y-2">
                {items.map((i) => (
                  <li key={i} className={`text-[13px] text-white/55 ${/[؀-ۿ]/.test(i) ? "urdu" : ""}`}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-5 text-[12px] text-white/35">
          <span>Free to use. Runs on open models.</span>
          <span>English · اردو</span>
        </div>

        <div className="select-none pb-2 pt-4 text-center">
          <span
            className="wordmark block bg-gradient-to-b from-white/16 to-white/[0.02] bg-clip-text text-transparent"
            style={{ fontSize: "clamp(54px, 17vw, 240px)", lineHeight: 0.85 }}
          >
            Sabaq
          </span>
        </div>
      </div>
    </footer>
  );
}
