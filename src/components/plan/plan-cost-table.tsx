import type { PlanResultsDto } from "@/lib/plan-results";
import { formatPln } from "@/lib/format/currency";
import { formatPlanCategory } from "@/lib/format/plan-category";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DISCLAIMER =
  "Powyższe kwoty mają charakter orientacyjny i nie stanowią oferty handlowej ani wiążącej wyceny.";

type PlanCostTableProps = {
  results: PlanResultsDto;
};

export function PlanCostTable({ results }: PlanCostTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kosztorys etapów</CardTitle>
        <CardDescription>Orientacyjne koszty poszczególnych etapów budowy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Etap</th>
                <th className="px-4 py-3 font-medium">Kategoria</th>
                <th className="px-4 py-3 text-right font-medium">Koszt</th>
              </tr>
            </thead>
            <tbody>
              {results.stages.map((stage) => (
                <tr key={stage.stageSlug} className="border-b last:border-0">
                  <td className="px-4 py-3">{stage.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatPlanCategory(stage.category)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPln(stage.estimatedCost)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-medium">
                <td className="px-4 py-3" colSpan={2}>
                  Razem
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatPln(results.totalCost)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {DISCLAIMER}
        </p>
      </CardContent>
    </Card>
  );
}
