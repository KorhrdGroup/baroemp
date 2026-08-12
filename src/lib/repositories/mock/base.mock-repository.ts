import type { CrudRepository } from "../types";

/**
 * 메모리 기반 Mock Repository 베이스 클래스.
 * 실제 프로덕션에서는 SupabaseXxxRepository가 동일한 인터페이스를 구현하게 된다.
 */
export class InMemoryRepository<T extends { id: string }, TInput, TFilter = undefined>
  implements CrudRepository<T, TInput, TFilter>
{
  protected items: T[];
  private readonly idPrefix: string;
  private readonly buildEntity: (input: TInput, id: string) => T;
  private readonly applyFilter?: (item: T, filter: TFilter) => boolean;
  private readonly applyUpdate: (item: T, input: Partial<TInput>) => T;

  constructor(options: {
    initialData: T[];
    idPrefix: string;
    buildEntity: (input: TInput, id: string) => T;
    applyUpdate: (item: T, input: Partial<TInput>) => T;
    applyFilter?: (item: T, filter: TFilter) => boolean;
  }) {
    this.items = [...options.initialData];
    this.idPrefix = options.idPrefix;
    this.buildEntity = options.buildEntity;
    this.applyUpdate = options.applyUpdate;
    this.applyFilter = options.applyFilter;
  }

  async findAll(filter?: TFilter): Promise<T[]> {
    if (!filter || !this.applyFilter) return [...this.items];
    return this.items.filter((item) => this.applyFilter!(item, filter));
  }

  async findById(id: string): Promise<T | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async create(input: TInput): Promise<T> {
    const id = `${this.idPrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const entity = this.buildEntity(input, id);
    this.items = [entity, ...this.items];
    return entity;
  }

  async update(id: string, input: Partial<TInput>): Promise<T | null> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const updated = this.applyUpdate(this.items[index], input);
    this.items = this.items.map((item, i) => (i === index ? updated : item));
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const existedBefore = this.items.some((item) => item.id === id);
    this.items = this.items.filter((item) => item.id !== id);
    return existedBefore;
  }
}
