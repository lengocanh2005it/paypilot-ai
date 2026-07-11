import { LANDING_STATS } from './landing-data';

export function StatsBand() {
  return (
    <section
      className="border-y border-border/60 bg-muted/20 py-12 sm:py-14"
      aria-label="Số liệu nổi bật"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-y-8 sm:gap-x-6 lg:grid-cols-4 lg:divide-x lg:divide-border/60">
          {LANDING_STATS.map((stat) => (
            <div key={stat.label} className="px-2 text-center lg:px-6">
              <p className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                {stat.value}
              </p>
              <p className="mx-auto mt-2 max-w-[16rem] text-sm text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
