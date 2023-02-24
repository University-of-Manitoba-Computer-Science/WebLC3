/**
 * armSimulator.ts
 *
 * The ARM simulator. Keeps track of the machine's state and interacts with the
 * UI.
 */

import UI from "../../presentation/ui";

export default class ARMSimulator
{
    public constructor(objectFile: Uint16Array, sourceCode: Map<number, string>)
    {
        UI.setSimulatorReady();
        UI.appendConsole("Simulator ready.");


        UI.appendConsole("Win");
    }
}