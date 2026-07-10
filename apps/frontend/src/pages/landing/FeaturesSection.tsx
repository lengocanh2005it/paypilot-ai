import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LANDING_FEATURES } from './landing-data';

export function FeaturesSection() {
  return (
    <section id="tinh-nang" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Mọi thứ SME cần để đóng sổ nhanh hơn
          </h2>
          <p className="mt-4 text-muted-foreground">
            Từ giao dịch ngân hàng đến báo cáo Excel — một nền tảng, không cần nhập tay từng dòng.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:auto-rows-fr md:grid-cols-3">
          {LANDING_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className={cn(
                  'group h-full border-border/70 bg-card/80 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
                  feature.className,
                )}
              >
                <CardHeader className="h-full">
                  <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
