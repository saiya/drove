/** オンメモリかつ局所的なキャッシュのための実装 */
export class OnMemoryCache {
  #clock: Clock = 1;

  #cache: {
    [key: string]: { owner: symbol; readonly value: any; clock: Clock } | undefined;
  } = {};

  #ownerInvalidatedAt: Map<symbol, Clock> = new Map();

  invalidateAll() {
    this.#cache = {};
    this.#ownerInvalidatedAt.clear();
    this.#clock = 1;
  }

  invalidateByOwner(owner: symbol) {
    // 境界バグを起こしにくいように、invalidate 前後の cache の clock は invalidate 時点の clock とは一致しないようにしている。
    // そのため advanceClock を 2 回実行している。
    // (原理的には advance 1 回だけでも実装できる)
    this.advanceClock();
    this.#ownerInvalidatedAt.set(owner, this.#clock);
    this.advanceClock();
  }

  invalidate(owner: symbol, key: string) {
    this.deleteFromCache(owner, key);
  }

  /**
   * キャッシュに値があればそれを返し、なければ与えられた関数を実行する。
   * 関数の戻り値はキャッシュされうる (パラメタ f のドキュメント参照)。
   *
   * @param owner キャッシュの所有者・名前空間を示す Symbol, 異なる symbol インスタンスの間ではキャッシュは共有されない
   * @param key キャッシュのキー
   * @param f undefined または null 以外の値を返した場合にキャッシュする
   */
  async get<T>(owner: symbol, key: string, f: () => Promise<T>): Promise<T> {
    let entry = this.#cache[key];
    if (entry && entry.owner !== owner) entry = undefined; // owner が異なるキャッシュは必ず無視する
    if (entry) {
      const invalidatedAt = this.#ownerInvalidatedAt.get(owner);
      if (invalidatedAt && entry.clock <= invalidatedAt) {
        entry = undefined; // invalidate されているキャッシュは必ず無視する
        this.deleteFromCache(owner, key); // キャッシュからも消す
      }
    }
    if (entry) return entry.value; // 有効なキャッシュが見つかったので返す

    // 以下、cache miss 時の処理
    const value = await f(); // ここで throw された場合、何もしない (キャッシュもしない)
    this.saveToCache(owner, key, value);
    return value;
  }

  /**
   * キャッシュを破棄し、必ず与えられた関数を実行する。
   * 関数の結果は get() メソッドと同じ仕様でキャッシュ対象になりうる (戻り値によってはキャッシュされない, get() のドキュメント参照)。
   */
  async overwrite<T>(owner: symbol, key: string, f: () => Promise<T>): Promise<T> {
    // f() 実行前にキャッシュを消すことによって f() が例外を投げた場合にキャッシュが無い状態になる。
    // このようにすることで、この overwrite() 呼び出しが例外を投げたとしても、以降に overwrite 前の情報が見えてしまうことを防ぐ。
    this.deleteFromCache(owner, key);

    const value = await f();
    this.saveToCache(owner, key, value);
    return value;
  }

  private deleteFromCache(owner: symbol, key: string) {
    if (this.#cache[key] && this.#cache[key]!.owner === owner) {
      delete this.#cache[key];
    }
  }

  private saveToCache(owner: symbol, key: string, value: any) {
    if (typeof value === "undefined" && value === null) {
      // undefined, null はキャッシュしない仕様
      delete this.#cache[key];
    } else {
      this.#cache[key] = { owner, value, clock: this.#clock };
    }
  }

  private advanceClock() {
    const before = this.#clock;
    this.#clock += 1;
    const after = this.#clock;
    if (!(before < after)) {
      // Clock が JS Number (浮動小数)で正確に表せる範囲を逸脱した
      this.invalidateAll();
    }
  }
}

type Clock = number;
