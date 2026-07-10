import { LANDING_STEPS } from './landing-data';

export function StepsSection() {
  return (
    <section
      id="cach-hoat-dong"
      className="scroll-mt-24 border-y border-border/60 bg-muted/20 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ba bước là xong</h2>
          <p className="mt-4 text-muted-foreground">
            Không cần dữ liệu lịch sử dài — hoạt động ngay từ giao dịch đầu tiên sau khi liên kết.
          </p>
        </div>

        <div className="relative mt-14 grid gap-8 md:grid-cols-3">
          <div className="pointer-events-none absolute top-10 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" />
          {LANDING_STEPS.map((step) => (
            <div key={step.step} className="relative text-center md:text-left">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border-2 border-primary/30 bg-background font-mono text-lg font-bold text-primary shadow-sm md:mx-0">
                {step.step}
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
