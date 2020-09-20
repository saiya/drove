import { uniqueArray, sortBy, shuffle, sequence } from "./index";

describe("array-utils", () => {
  it("uniqueArray", () => {
    expect(uniqueArray([]).sort()).toEqual([]);
    expect(uniqueArray([ "a", "b", "c", Math.PI, null ]).sort()).toEqual([ "a", "b", "c", Math.PI, null ].sort());
    expect(uniqueArray([ "a", "b", null, "c", null, "b", "a", Math.PI, null ]).sort()).toEqual([ "a", "b", "c", Math.PI, null ].sort());
  });
  it("sortBy", () => {
    expect(sortBy([])).toEqual([]);
    expect(sortBy(shuffle([ "a", "b", "c", "d", "e", "f", "g" ]), (item) => ({
      g: +100,
    } as { [item: string]: number | undefined})[item], (item) => ({
      a: 0,
      b: 1,
      c: 2,
      d: 3,
      e: 4,
      f: 5,
    } as { [item: string]: number | undefined})[item])).toEqual(
      [ "a", "b", "c", "d", "e", "f", "g" ],
    );
  });
  it("shuffle", () => {
    expect(shuffle([]).sort()).toEqual([]);
    expect(shuffle([ 1 ]).sort()).toEqual([ 1 ]);
    expect(shuffle([ 4, 3, 2, 1 ]).sort()).toEqual([ 1, 2, 3, 4 ]);
  });
  it("sequence", () => {
    expect(sequence(-1)).toEqual([]);
    expect(sequence(0)).toEqual([]);
    expect(sequence(1)).toEqual([ 0 ]);
    expect(sequence(Math.PI)).toEqual([ 0, 1, 2, 3 ]);
    expect(sequence(5)).toEqual([ 0, 1, 2, 3, 4 ]);
  });
});
