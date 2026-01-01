declare module "@strudel/codemirror" {
  export class StrudelMirror {
    constructor(options: {
      defaultOutput: any;
      getTime: () => number;
      transpiler: any;
      root: HTMLElement | null;
      initialCode: string;
      pattern?: any;
      drawTime?: [number, number];
      autodraw?: boolean;
      bgFill?: boolean;
      prebake?: () => Promise<void>;
      onToggle?: (started: boolean) => void;
    });
    code: string;
    setCode(code: string): void;
    evaluate(): Promise<void>;
    stop(): Promise<void>;
    setFontSize?(size: number): void;
    setFontFamily?(family: string): void;
    setLineNumbersDisplayed?(shown: boolean): void;
  }
}

declare module "@strudel/transpiler" {
  export const transpiler: any;
}

declare module "@strudel/webaudio" {
  export function getAudioContext(): AudioContext;
  export function webaudioOutput(options: any): any;
  export function initAudioOnFirstClick(options?: { maxPolyphony?: number; audioDeviceName?: string; multiChannelOrbits?: boolean }): Promise<void>;
  export function registerSynthSounds(): Promise<void>;
  export function samples(sampleMap: string | Record<string, any>, baseUrl?: string, options?: any): Promise<void>;
  export function renderPatternAudio(
    pattern: any,
    cps: number,
    begin: number,
    end: number,
    sampleRate: number,
    maxPolyphony: number,
    multiChannelOrbits: boolean,
    downloadName?: string
  ): Promise<void>;
  export function initAudio(options?: { maxPolyphony?: number; audioDeviceName?: string; multiChannelOrbits?: boolean }): Promise<void>;
}

declare module "@strudel/core" {
  export function evalScope(...modules: Promise<any>[]): Promise<void>;
  export const silence: any;
  export class Pattern {
    static prototype: any;
  }
}

declare module "@strudel/soundfonts" {
  export function registerSoundfonts(): Promise<void>;
}

declare module "@strudel/draw" {
  const draw: any;
  export = draw;
}

declare module "@strudel/mini" {
  const mini: any;
  export = mini;
}

declare module "@strudel/tonal" {
  const tonal: any;
  export = tonal;
}
