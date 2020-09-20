import { DAG } from "./index";
import { shuffle } from "@drove/array-utils";

describe("DiGraph", () => {
  describe("topologicalSort", () => {
    it("empty graph", () => {
      const graph = new DAG<string>([], []);
      expect(graph.topologicalSort()).toEqual({
        layers: [],
        loops: [],
        leafOfLoops: new Set(),
      });
    });

    it("simple DAG", () => {
      const graph = new DAG(
        shuffle([
          "0",
          "dangling", // depth 0
          "1a",
          "1b",
          "1c", // depth 1
          "2x",
          "2y",
          "2z", // depth 2
        ]),
        shuffle([
          // depth 0 to 1
          ["0", "1a"],
          ["0", "1b"],
          ["0", "1c"],

          // depth 1 to 2
          ["1a", "2x"],
          ["1b", "2x"],
          ["1b", "2y"],
          ["1b", "2z"],

          // depth 0 to 2
          ["0", "2x"],
        ])
      );

      const { layers, loops } = graph.topologicalSort();
      expect(loops).toEqual([]); // No loop

      expect(layers[0].nodes.sort()).toEqual(["0", "dangling"].sort());
      expect(layers[1].nodes.sort()).toEqual(["1a", "1b", "1c"].sort());
      expect(layers[2].nodes.sort()).toEqual(["2x", "2y", "2z"].sort());
    });

    it("looped graph", () => {
      const graph = new DAG(
        shuffle([
          "dangling",

          // acyclic sub-graph
          "z",
          "y",
          "x",
          "w",

          // Self loop
          "self loop",
          // Cycle 1
          "a",
          "b",
          "c",
          "X",
          "Y",
          // Cycle 2
          "1",
          "2",
          "3",
          "X",
          "Y", // Share nodes with other cycle
          // Cycle leaf
          "b-sub1",
          "b-sub2",
          "Y-sub",
        ]),
        shuffle([
          // acyclic sub-graph
          ["z", "y"],
          ["z", "x"],
          ["y", "w"],
          ["x", "w"],
          // Self loop
          ["self loop", "self loop"],
          // Cycle 1
          ["a", "b"],
          ["b", "c"],
          ["c", "X"],
          ["X", "Y"],
          ["Y", "a"],
          // Cycle 2
          ["1", "2"],
          ["2", "3"],
          ["3", "X"],
          ["X", "Y"],
          ["Y", "1"],
          // Cycle leaf
          ["b", "b-sub1"],
          ["b-sub1", "b-sub2"],
          ["Y", "Y-sub"],
        ])
      );

      const { layers, loops, leafOfLoops } = graph.topologicalSort();
      expect(layers[0].nodes.sort()).toEqual(["z", "dangling"].sort());
      expect(layers[1].nodes.sort()).toEqual(["y", "x"].sort());
      expect(layers[2].nodes.sort()).toEqual(["w"].sort());
      expect([...leafOfLoops].sort()).toEqual(["b-sub1", "b-sub2", "Y-sub"].sort());

      const selfLoop = loops.find((loop) => loop.nodes.includes("self loop"))!;
      expect(selfLoop.hasEdge("self loop", "self loop")).toBeTruthy();

      // 8 の字に 1, 2, 3 を含むひと筆書きしている可能性も、a から X, Y 経由ですぐ a に戻ってきている可能性もある (仕様としてどちらも可)
      const loopA = loops.find((loop) => loop.nodes.includes("a"))!;
      expect(loopA.hasEdge("a", "b")).toBeTruthy();
      expect(loopA.hasEdge("b", "c")).toBeTruthy();
      expect(loopA.hasEdge("c", "X")).toBeTruthy();
      expect(loopA.hasEdge("Y", "a")).toBeTruthy();

      const loop1 = loops.find((loop) => loop.nodes.includes("1"))!;
      expect(loop1.hasEdge("1", "2")).toBeTruthy();
      expect(loop1.hasEdge("2", "3")).toBeTruthy();
      expect(loop1.hasEdge("3", "X")).toBeTruthy();
      expect(loop1.hasEdge("Y", "1")).toBeTruthy();
    });

    it("has path between loops", () => {
      const graph = new DAG(
        shuffle([
          // Cycle 1
          "a",
          "b",
          "c",
          // Cycle 2
          "1",
          "2",
          "3",
          // Node between cycle
          "X",
          "Y",
          "Z",
        ]),
        shuffle([
          // Cycle 1
          ["a", "b"],
          ["b", "c"],
          ["c", "a"],
          // Cycle 2
          ["1", "2"],
          ["2", "3"],
          ["3", "1"],
          // Path between cycles
          ["c", "X"],
          ["X", "Y"],
          ["Y", "Z"],
          ["Z", "1"],
        ])
      );

      const { layers, loops, leafOfLoops } = graph.topologicalSort();
      expect(layers).toEqual([]);

      expect([...leafOfLoops].sort()).toEqual(["X", "Y", "Z"].sort());

      const loopA = loops.find((loop) => loop.nodes.includes("a"))!;
      expect(loopA.hasEdge("a", "b")).toBeTruthy();
      expect(loopA.hasEdge("b", "c")).toBeTruthy();
      expect(loopA.hasEdge("c", "a")).toBeTruthy();

      const loop1 = loops.find((loop) => loop.nodes.includes("1"))!;
      expect(loop1.hasEdge("1", "2")).toBeTruthy();
      expect(loop1.hasEdge("2", "3")).toBeTruthy();
      expect(loop1.hasEdge("3", "1")).toBeTruthy();
    });
  });

  describe("transitiveReduction", () => {
    it("Simple graph", () => {
      const graph = new DAG(
        shuffle(["dangling", "a", "b", "c", "e"]),
        shuffle([
          ["a", "b"],
          ["b", "c"],
          ["a", "c"], // Redundant edge (bypasses a -> b -> c)
          ["a", "e"],
        ])
      );
      const result = graph.transitiveReduction();

      expect(result.nodes.sort()).toEqual(graph.nodes.sort()); // Should not change nodes list
      expect(result.hasEdge("a", "b")).toBeTruthy();
      expect(result.hasEdge("b", "c")).toBeTruthy();
      expect(result.hasEdge("a", "c")).toBeFalsy(); // Should be deleted
      expect(result.hasEdge("a", "e")).toBeTruthy();
    });

    it("Cycle", () => {
      const graph = new DAG(
        shuffle(["dangling", "a", "b", "c", "d", "e"]),
        shuffle([
          ["a", "b"],
          ["b", "c"],
          ["c", "d"],
          ["d", "e"],
          ["a", "e"], // Redundant (bypasses a -> b -> c -> d -> e)
        ])
      );
      const result = graph.transitiveReduction();

      expect(result.nodes.sort()).toEqual(graph.nodes.sort()); // Should not change nodes list
      expect(result.hasEdge("a", "b")).toBeTruthy();
      expect(result.hasPath("a", "e")).toBeTruthy();
      expect(result.hasEdge("a", "e")).toBeFalsy(); // Should be deleted
    });
  });
});
