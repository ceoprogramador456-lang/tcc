// Permite serializar BigInt (usado pela PK de `leitura`) em JSON.stringify/res.json.
declare global {
  interface BigInt {
    toJSON(): number;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function (this: bigint): number {
  return Number(this);
};

export {};
