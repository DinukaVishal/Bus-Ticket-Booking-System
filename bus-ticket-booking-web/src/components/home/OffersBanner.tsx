import { useOffers } from '@/hooks/useOffers';
import { Button } from '@/components/ui/button';

const OffersBanner = () => {
  const { data: offers = [] } = useOffers(true);

  if (!offers || offers.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="rounded-xl border border-border bg-card/80 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Special Offers</h3>
          <div className="text-sm text-muted-foreground">Use code at checkout</div>
        </div>

        <div className="flex gap-3 overflow-x-auto py-1">
          {offers.slice(0, 6).map((o: any) => (
            <div key={o.id} className="min-w-[240px] p-3 rounded-lg border bg-background/60 flex-shrink-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{o.title}</div>
                  {o.route_name && (
                    <div className="text-xs text-muted-foreground truncate">
                      {o.from_city} → {o.to_city}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground truncate">{o.description}</div>
                </div>
                <div className="text-sm font-semibold text-primary ml-2 whitespace-nowrap">
                  {o.discount_percent ? `${o.discount_percent}%` : o.discount_amount ? `Rs ${o.discount_amount}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-mono px-2 py-1 bg-muted rounded text-xs flex-1 truncate">{o.code}</div>
                <Button size="sm" onClick={() => { navigator.clipboard?.writeText(o.code); }}>Copy</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OffersBanner;
