/**
 * armAssembler.ts
 *
 * Converts program source code into a binary object file, which consists of the
 * starting address of the program followed by the assembled machine code. It
 * also generates a Map with memory addresses as the keys and corresponding
 * lines of source code as the values, which is used to display the code
 * alongside the computer's memory in the simulator user interface.
 */

import UI from "../../presentation/ui";

export default class ARMAssembler
{
    // Errors where assembly cannot begin for given file
    private static errors = {
        INFILE: "Source code is empty",
    };

    /**
     * Assemble the given ARM source code.
     *
     * If there are errors in the code, print errors to the editor
     * console and return [null, null].
     * If the code is assembled successfully: print a success message
     * to the editor console, return the resulting object file as a
     * Uint16Array and a Map of memory addresses mapped to the source
     * code that was assembled and placed at that address.
     * @param {string} sourceCode the code to assemble
     * @param {boolean} saveFiles if true (default), save the resulting object file and symbol table
     * @returns {Promise<[Uint16Array, Map<number, string>] | null>}
     */
    public static async assemble(sourceCode: string, saveFiles: boolean = true)
        : Promise<[Uint16Array, Map<number, string>] | null>
    {
        const sourceLines = sourceCode.split(/[\r]?[\n]/);

        console.log(sourceLines);

        if (sourceLines.length == 1 && sourceLines[0] == '')
        {
            UI.appendConsole(this.errors.INFILE + "\n");
            return null;
        }

        const result = new Uint16Array(3);
        const addressToCode: Map<number, string> = new Map();

        result[0] = 0;
        result[1] = 0b0011000000000001;
        addressToCode.set(0, "add r0, #1");
        result[2] = 0b1101111100001011;
        addressToCode.set(1, "swi #11");

        console.log(result);
        return [result, addressToCode]
    }
}