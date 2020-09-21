export type CancelContext = {
  /**
   * Node.js のイベントループの仕組み上、Ctrl-C や kill などでの graceful shutdown は協調的に行いざるをえない。
   * そのため、そういった事象が発生した場合はこのメソッドに Error を登録し、{@see throwIfCanceled} で自主的にそのエラーをチェックする。
   * @param e Error object, re-thrown by {@see throwIfCanceled}.
   */
  cancel(e: Error): void;
  /**
   * 重い I/O 処理や時間のかかる計算処理の前や途中で呼び出すべきメソッド。
   * {@see cancel} で登録された例外オブジェクトがある場合にそれを throw するため、このメソッドの呼び出し元の処理は途中終了される。
   * Ctrl-C や kill などの事象を受けて処理を中断する動きを実現できる。
   *
   * try - finally で囲うことにより、クリーンナップ処理も可能である。
   *
   * @throws {@see cancel} で与えられた Error があれば throw する
   */
  throwIfCanceled(): void;
};

export const implementCancel = <T extends {}>(base: T): T & CancelContext => {
  let canceled: Error | undefined = undefined;
  return {
    ...base,
    cancel: (e) => { canceled = e; },
    throwIfCanceled: () => {
      if (canceled) throw canceled;
    },
  };
};
