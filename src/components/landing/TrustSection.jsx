import { motion } from "framer-motion";
import Container from "./Container";
import { inView, revealUp } from "./motion";

/**
 * The trust band, from the prototype.
 *
 * Ruled top and bottom, 34px of padding, and the institutions set as
 * abbreviated typographic wordmarks — WIUT, TUIT, MDIS, WEBSTER UNIVERSITY,
 * TSUL — at 17px/800 in a neutral grey, with `filter:grayscale(1)` and 0.75
 * opacity over the row. No marquee: the prototype centres a static, wrapping
 * flex row with a 56px gap.
 *
 * "Trusted by students from" is the prototype's own wording, and it is the
 * accurate one — it describes where students study, not an endorsement by the
 * institutions.
 */

const INSTITUTIONS = [
  { name: "WIUT" },
  { name: "TUIT" },
  { name: "MDIS" },
  // The prototype sets this one smaller and over two lines so the longer name
  // does not dominate the row.
  { name: "WEBSTER\nUNIVERSITY", small: true },
  { name: "TSUL" },
];

function TrustSection() {
  return (
    <section className="border-y border-border bg-white">
      <Container className="py-[34px] text-center">
        <motion.div variants={revealUp} initial="hidden" whileInView="visible" viewport={inView}>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gray-400">
            Trusted by students from
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-75 grayscale sm:gap-x-14">
            {INSTITUTIONS.map(({ name, small }) => (
              <span
                key={name}
                className={
                  small
                    ? "whitespace-pre text-center text-[14px] font-extrabold leading-[1.3] tracking-[0.1em] text-[#6B7080]"
                    : "text-[17px] font-extrabold tracking-[0.06em] text-[#6B7080]"
                }
              >
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

export default TrustSection;
