declare module "bwip-js" {
  export type BwipJsOptions = {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    textxalign?: string;
    backgroundcolor?: string;
    paddingwidth?: number;
    paddingheight?: number;
  };

  export function toBuffer(options: BwipJsOptions): Promise<Buffer>;

  const bwipJs: {
    toBuffer: typeof toBuffer;
  };

  export default bwipJs;
}
