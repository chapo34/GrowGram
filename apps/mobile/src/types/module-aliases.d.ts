// types/module-aliases.d.ts
// Sorgt dafür, dass TS/VSCode alle Alias-Imports kennt – auch wenn einzelne
// Module (z.B. JS-Dateien) keine eigenen Typen haben.

declare module '@app/*';
declare module '@core/*';
declare module '@features/*';
declare module '@shared/*';
declare module '@assets/*';
declare module '@types/*';