// sharp 0.35 ships these declarations but omits them from its exports map.
declare module "sharp" {
  const sharp: typeof import("../node_modules/sharp/lib/index");
  export = sharp;
}
