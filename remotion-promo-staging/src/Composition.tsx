import { Composition } from "remotion";
import { MulticotizadorPromo } from "./MulticotizadorPromo";

export const RemotionComposition: React.FC = () => <Composition id="MulticotizadorPromo" component={MulticotizadorPromo} durationInFrames={600} fps={30} width={1920} height={1080} />;
