import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm';

const snake = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/** `pricePerNight` is stored as `price_per_night`, and an embedded `layout.cs` as `layout_cs`. */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  override columnName(
    property: string,
    custom: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    return snake([...embeddedPrefixes, custom ?? property].join('_'));
  }

  override joinColumnName(relation: string, referencedColumn: string): string {
    return snake(`${relation}_${referencedColumn}`);
  }
}
