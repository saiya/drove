import { sortBy } from "@drove/array-utils";

/**
 * 有向グラフのアルゴリズム実装。
 *
 * あくまで infra ツール用であるため、大量ノードに対する処理性能は高くない (実装の単純・素朴さを優先している)。
 *
 * - Immutable である
 * - JSON などにシリアライズはできない (内部構造の互換性維持を保証をしないため, 将来の拡張性担保)
 *
 * @param T ノードの型
 */
export class DAG<T extends unknown> {
  /** ノード一覧, 重複なし。配列である(= 列挙順が確実に固定)であるためネストしたループで O(n^2) に列挙したりする際に便利 */
  private readonly _nodes: readonly T[];

  private readonly nodesSet: ReadonlySet<T>;

  /** From -> To[], 重複なし */
  private readonly nodesFrom: ReadonlyMap<T, ReadonlySet<T>>;

  /** To -> From[], 重複なし */
  private readonly nodesTo: ReadonlyMap<T, ReadonlySet<T>>;

  /**
   * @param nodes ノードの一覧。同一性は === で判定される。重複は無視する。null, undefined, -0 (minus zero) を含むことは出来ない。Node が参照型の場合、このコンストラクタ以降に node へ変更を加えられてしまった場合の挙動は未定義挙動となる (無限ループ等の事故もありえる)。
   * @param edges [from, to] のリスト。重複は無視する。nodes に存在しない from や to は不正。
   */
  constructor(nodes: Iterable<T>, edges: Iterable<[T, T]>) {
    const nodesSet = new Set<T>();
    for (const node of nodes) {
      if (typeof node === "undefined") throw new Error(`Nodes must not contain undefined`);
      if (node === null) throw new Error(`Nodes must not contain null`);
      // IEEE 浮動小数・JS number には -0 があるが、JS の === 演算子と Map や Set において扱いが異なっており、本クラスのロジックの複雑化・バグのリスク上昇を招くため意図的に拒否している
      if (typeof node === "number" && node === 0 && Math.sign(1 / node) === -1) throw new Error(`Cannot use minus zero (-0) as a node`);

      nodesSet.add(node);
    }
    this._nodes = [...nodesSet]; // Set なので重複ナシ保証している (アルゴリズム停止性のための仕込み)
    this.nodesSet = nodesSet;

    const nodesFrom = new Map<T, Set<T>>();
    const nodesTo = new Map<T, Set<T>>();
    for (const [from, to] of edges) {
      if (!nodesSet.has(from)) throw new Error(`"From" node of the edge ${JSON.stringify(from)} -> ${JSON.stringify(to)} is not found in the nodes list`);
      if (!nodesSet.has(to)) throw new Error(`"To" node of the edge ${JSON.stringify(from)} -> ${JSON.stringify(to)} is not found in the nodes list`);

      const fromChain = nodesFrom.get(from) ?? new Set();
      nodesFrom.set(from, fromChain);
      if (fromChain.has(to)) continue; // 重複 edge なのでスキップ(アルゴリズム停止性のための仕込み)
      fromChain.add(to);

      const toChain = nodesTo.get(to) ?? new Set();
      nodesTo.set(to, toChain);
      toChain.add(from);
    }
    this.nodesFrom = nodesFrom;
    this.nodesTo = nodesTo;
  }

  toJSON() {
    throw new Error(`Should not serialize DiGraph`);
  }

  /** トポロジカルソート (しかも、ノードを深さ別の集合に明確に分別して返す) */
  topologicalSort(): {
    /** トポロジカルソート結果, ループに含まれるノードはここには含まれない */
    layers: {
      /** 0-start の depth */
      depth: number;
      nodes: T[];
    }[];
    /** ループ一覧 (このグラフのサブグラフかつ全ノードの入・出次数が 1 のグラフかつ空でないグラフ一覧), ループを成しているノードは、少なくとも 1 つの loop に現れる (複数に現れることもある)。 */
    loops: DAG<T>[];
    /** ループを構成していないが、ループから参照されてしまっている(ために depth が定義できない)ノードの一覧 */
    leafOfLoops: Set<T>;
  } {
    /** From -> To[] */
    const nodesFrom = this.copyNodesFrom();
    /** To -> From[] */
    const nodesTo = this.copyNodesTo();

    const layers: { depth: number; nodes: T[] }[] = [];
    const visitedNodes = new Set<T>();

    // Kahn のアルゴリズム - グラフからノード・エッジを除去しつつトポロジカルソートする, O(ノード数 + エッジ数)
    // this でなくローカル変数を改変していく
    let thisLayerNodes = this._nodes.filter((node) => (nodesTo.get(node) ?? new Set()).size === 0);
    // eslint-disable-next-line no-plusplus
    for (let depth = 0; thisLayerNodes.length > 0; depth++) {
      layers.push({ depth, nodes: [...thisLayerNodes] });
      thisLayerNodes.forEach((node) => visitedNodes.add(node));

      // thisLayerNodes に含まれる node をグラフから除去する
      for (const from of thisLayerNodes) {
        // thisLayerNodes のノードは入次数が必ず 0 なので、ノードから出るエッジだけを消せば良い
        nodesFrom.get(from)?.forEach((to) => {
          nodesTo.get(to)!.delete(from);
        });
        nodesFrom.delete(from); // ここも leafOfLoops 検出のために正しく更新しておく必要がある
      }
      thisLayerNodes = this._nodes.filter((node) => !visitedNodes.has(node) && (nodesTo.get(node) ?? new Set()).size === 0);
    }

    // 自身に戻る経路を持たないノードのうち、visit していない(= topological sort できなかった)ノードは、ループに繋がるエッジを持つがループを形成はしていないノードである (ループから来るエッジがあったり、ループとループの間にある)
    const leafOfLoops = new Set<T>(this._nodes.filter((node) => !visitedNodes.has(node) && !this.hasPath(node, node)));

    // 残るのはループを構成しているノードだけ
    const loopNodes = this._nodes.filter((node) => !visitedNodes.has(node) && !leafOfLoops.has(node));
    return {
      layers,
      leafOfLoops,
      loops: this.coveringLoopsOf(new Set(loopNodes)),
    };
  }

  /**
   * 与えられたノードの一覧(順不同)をカバーするように、円環状のループ構造のグラフを列挙する。
   *
   * 与えられたノードをカバーするだけであり、全てのエッジを網羅するとは限らない (e.g. A <-> B <-> C <-> A のグラフで A -> B -> A と B -> C -> B を出力し C -> A -> C が出てこない、等がありえる)。
   * 列挙結果に無駄がない保証はない (e.g. A <-> B -> C -> A のグラフで A -> B -> A と A -> B -> C -> A 両方を出力することが可である)。
   *
   * @param nodes ループをなすノードの一覧。ループを構成できないノード(nodes 内の他のノードへのエッジを持たないノード)が含まれていてはいけない。
   * @returns ループの一覧。各グラフは、全ノードの入・出次数が 1 である。与えられた各 node は戻り値 DiGraph のうち一つ以上に必ず現れる。
   */
  private coveringLoopsOf(nodes: Set<T>): DAG<T>[] {
    const _nodes = [...nodes]; // 処理の効率のためだけに Array に変換している
    const result: DAG<T>[] = [];
    const vistedNodes = new Set<T>();

    // 現時点の実装は O(n^2) になっているので効率が良くはない (nextNode の見つけ方を本来もっとよくできる)
    while (vistedNodes.size !== nodes.size) {
      // Visit していないノードがある = まだ探索していないループ構造がある ということである
      const unvisitedNodes = new Set(_nodes.filter((node) => !vistedNodes.has(node)));

      /** 今回抽出するループ構造のエッジ一覧 */
      const loop: [T, T][] = [];
      const start: T = [...unvisitedNodes][0]; // unvisitedNodes の各ノードは必ず未抽出のループ構造の一部である
      let current = start!;
      do {
        vistedNodes.add(current);
        unvisitedNodes.delete(current);

        // ループの次のノードは、start 地点に戻る経路を持っているノードであれば良い。
        // eslint-disable-next-line no-loop-func
        const nextNodes = sortBy(
          [...(this.nodesFrom.get(current) ?? new Set())].filter((node) => this.hasPath(node, start)),
          (node) => (node === start ? 0 : 1), // start に戻る経路があるならば最優先する (2 重のループ構造などの場合に、start に戻らない別経路を探索してしまうことを防ぐ)
          (node) => (unvisitedNodes.has(node) ? 0 : 1), // 比較的効率的に与えられた nodes を網羅するために unvisited なノードを優先する
          (node) => this.getPathMap().get(node)!.get(start)!.length
        );
        const nextNode = nextNodes[0];
        if (!nextNode) throw new Error(`Dead-end node given (${JSON.stringify(current)}) in ${JSON.stringify(_nodes)}, edges: ${JSON.stringify(this.edges)}`);

        loop.push([current, nextNode]);
        current = nextNode!;
      } while (current !== start!);

      result.push(
        new DAG(
          loop.map(([node]) => node),
          loop
        )
      );
    }
    return result;
  }

  /**
   * 推移簡約を行った結果を返す。
   * 例えばエッジ A -> B -> C と A -> C が存在する場合に A -> C のエッジを削除して返す。
   */
  transitiveReduction(): DAG<T> {
    const nodesFrom = this.copyNodesFrom();

    // reflexive reduction
    for (const [from, toSet] of nodesFrom) {
      toSet.delete(from); // 同じノードでループしているエッジを除去
    }

    // transitive reduction
    // see: https://stackoverflow.com/questions/1690953/transitive-reduction-algorithm-pseudocode#comment23434677_6702198
    for (const u of this._nodes) {
      for (const v of nodesFrom.get(u) ?? []) {
        // この時点で、u -> v のエッジがある
        // reflexive reduction を既に施しているため、u != v である保証もある
        for (const w of this._nodes) {
          if (this.hasPath(v, w)) {
            // u -> v -> ... -> w という経路が存在する
            if (v !== w) {
              // v = w の場合は u -> v=w のエッジ(長さ 1 の経路である)を消してはいけない, グラフの連結性が損なわれる (このケースはループが存在する場合に this.hasPath の仕様上発生する)。
              // v != w であれば、 u -> v -> ... -> w という長さ 2 以上の経路の存在が保証されるため、u -> w のエッジが(もし有れば)消す。
              nodesFrom.get(u)?.delete(w);
            }
          }
        }
      }
    }

    return new DAG(
      this._nodes,
      [...nodesFrom].flatMap(([from, toSet]): [T, T][] => [...toSet].map((to) => [from, to]))
    );
  }

  /** 注意: 初回呼び出し時に path matrix を構築するため、初回は遅い */
  hasPath(from: T, to: T): boolean {
    return typeof this.getPathMap().get(from)?.get(to) !== "undefined";
  }

  /**
   * from から to への経路を返す。経由するエッジ数が最小の経路のうちいずれかを返す。
   * 注意: 初回呼び出し時に path matrix を構築するため、初回は遅い。
   */
  path(
    from: T,
    to: T,
    opts: {
      /** true の場合、戻り値の経路情報の先頭に from 自身が含まれる */
      includeFrom: boolean;
      /** true の場合、戻り値の経路情報の末尾に to 自身が含まれる */
      includeTo: boolean;
    }
  ): T[] | undefined {
    const path = this.getPathMap().get(from)?.get(to);
    if (typeof path === "undefined") return undefined;

    return [...(opts.includeFrom ? [from] : []), ...(opts.includeTo ? path : path.slice(0, -1))];
  }

  //
  // --- Primitive operation ---
  //

  get nodes(): T[] {
    return [...this._nodes]; // Array をコピーしないと危ない
  }

  hasNode(node: T): boolean {
    return this.nodesSet.has(node);
  }

  get edges(): [T, T][] {
    return [...this.nodesFrom].flatMap(([from, toList]) => [...toList].map((to): [T, T] => [from, to]));
  }

  hasEdge(from: T, to: T): boolean {
    return this.nodesFrom.get(from)?.has(to) ?? false;
  }

  //
  // --- Internal operation ---
  //

  /** nodesFrom のコピーを返す, Map や Array は別のインスタンスになっており、修正しても this インスタンスの状態を破壊しない */
  private copyNodesFrom(): Map<T, Set<T>> {
    return new Map<T, Set<T>>([...this.nodesFrom].map(([key, value]) => [key, new Set(value)]));
  }

  /** nodesTo のコピーを返す, Map や Array は別のインスタンスになっており、修正しても this インスタンスの状態を破壊しない */
  private copyNodesTo(): Map<T, Set<T>> {
    return new Map<T, Set<T>>([...this.nodesTo].map(([key, value]) => [key, new Set(value)]));
  }

  private _pathMapCache: Map<T, Map<T, T[]>> | undefined;

  /**
   * 経路行列(グラフ内の任意の 2 ノードの連結関係)を path の情報と共に返す。
   *
   * @return Map<start, Map<end, via[]>>, via[] は start を含まず end を含む経路情報。複数経路がある場合、経由エッジ数が最小の経路のうちいずれかであることを保証。
   */
  private getPathMap(): Map<T, Map<T, T[]>> {
    if (this._pathMapCache) return this._pathMapCache;

    // Warshall–Floyd Algorithm
    const result = new Map<T, Map<T, T[]>>();
    for (const [from, toSet] of this.nodesFrom) {
      for (const to of toSet) {
        const chain = result.get(from) ?? new Map<T, T[]>();
        result.set(from, chain);
        chain.set(to, [to]); // start を含まず end を含む経路情報なので、直接の edge での連結関係はこうなる
      }
    }
    for (const k of this._nodes) {
      for (const i of this._nodes) {
        for (const j of this._nodes) {
          const i2k = result.get(i)?.get(k);
          const k2j = result.get(k)?.get(j);
          if (!(i2k && k2j)) continue;

          const newPath = [...i2k, ...k2j]; // i から j までの k を経由する経路 (i を含まず j で終わる配列)
          const currentPath = result.get(i)?.get(j);
          if (!currentPath || currentPath.length > newPath.length) {
            const chain = result.get(i) ?? new Map();
            result.set(i, chain);
            chain.set(j, newPath);
          }
        }
      }
    }
    this._pathMapCache = result;
    return result;
  }
}
