import { Config } from "@remotion/cli/config";

// Motion graphics are flat colour: crf 18 keeps edges crisp and files small (config/platforms.yaml).
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
Config.setAudioBitrate("192k");
Config.setEntryPoint("index.ts");
