/** 重複を排除した配列を返す, 配列の並び順は維持されない点に注意 */
export const uniqueArray = <T>(arr: T[]): T[] => Array.from(new Set(arr));

/** T のプロパティまたは与えられた関数の戻り値でソートした結果の配列を返す, また Array#sort と異なり非破壊的。 */
export const sortBy = <T>(arr: readonly T[], ...props: (keyof T | ((item: T) => any))[]): T[] =>
  [...arr].sort((a, b) => {
    for (const prop of props) {
      const valueA = typeof prop === "function" ? prop(a) : a[prop];
      const valueB = typeof prop === "function" ? prop(b) : b[prop];
      const diff = compare(valueA, valueB);
      if (diff !== 0) return diff;
    }
    return 0;
  });

const compare = (a: any, b: any): number => {
  if (typeof a === "undefined") {
    return typeof b === "undefined" ? 0 : -1;
  }
  if (typeof b === "undefined") {
    return +1;
  }
  return a > b ? 1 : a < b ? -1 : 0;
};

export const shuffle = <T>(arr: T[]): T[] => {
  const result = [...arr];
  // https://stackoverflow.com/a/12646864
  // eslint-disable-next-line no-plusplus
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/** 0 以上 maxExclusive 以下の整数を順に要素に持つ配列を返す */
export const sequence = (maxExclusive: number): number[] => Array.from(Array(Math.max(0, Math.ceil(maxExclusive))).keys());
