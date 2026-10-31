/** public/ からの相対パス（Remotionでは staticFile()、Node側では public/ 配下のファイル） */
export const simulationStaticPath = (seed: number) => `simulations/lbs-${seed}.json`;
