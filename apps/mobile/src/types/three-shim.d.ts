// Minimaler Shim, damit TS nicht mehr meckert, dass "three" kein Typ-File hat.
declare module 'three' {
  const content: any;
  export = content;
}