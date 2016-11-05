/* tslint:disable */

/**
 * @license
 * Copyright 2016 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as ts from "typescript";

import {
    CONFIG_FILENAME,
    DEFAULT_CONFIG,
    findConfiguration,
} from "./configuration";
import {consoleTestResultHandler, runTest} from "./test";
import * as Linter from "./tslintMulti";

export interface ICliArgs {
    /**
     * Path to a configuration file.
     */
    config?: string;

    /**
     * Exclude globs from path expansion.
     */
    exclude?: string | string[];

    /**
     * File paths to lint.
     */
    files?: string[];

    /**
     * Whether to return status code 0 even if there are lint errors.
     */
    force?: boolean;

    /**
     * Output format.
     */
    format?: string;

    /**
     * Formatters directory path.
     */
    formattersDirectory?: string;

    /**
     * Whether to display detailed help.
     */
    help?: boolean;

    /**
     * Whether to generate a tslint.json config file in the current working directory.
     */
    init?: boolean;

    /**
     * Output file path.
     */
    out?: string;

    /**
     * tsconfig.json file.
     */
    project?: string;

    /**
     * Rules directory paths.
     */
    rulesDirectory?: string | string[];

    /**
     * That TSLint produces the correct output for the specified directory.
     */
    test?: string;

    /**
     * Whether to enable type checking when linting a project.
     */
    typeCheck?: boolean;

    /**
     * Current TSLint version.
     */
    version?: boolean;
}

/**
 * Runs TSLint using parsed arguments from the CLI.
 */
export class CliRunner {
    constructor(private options: ICliArgs, private outputStream: NodeJS.WritableStream) { }

    public run(onComplete: (status: number) => void) {
        if (this.options.version != null) {
            this.outputStream.write(Linter.VERSION + "\n");
            onComplete(0);
            return;
        }

        if (this.options.init != null) {
            if (fs.existsSync(CONFIG_FILENAME)) {
                console.error(`Cannot generate ${CONFIG_FILENAME}: file already exists`);
                onComplete(1);
                return;
            }

            const tslintJSON = JSON.stringify(DEFAULT_CONFIG, undefined, "    ");
            fs.writeFileSync(CONFIG_FILENAME, tslintJSON);
            onComplete(0);
            return;
        }

        if (this.options.test != null) {
            const results = runTest(this.options.test, this.options.rulesDirectory);
            const didAllTestsPass = consoleTestResultHandler(results);
            onComplete(didAllTestsPass ? 0 : 1);
            return;
        }

        // when provided, it should point to an existing location
        if (this.options.config && !fs.existsSync(this.options.config)) {
            console.error("Invalid option for configuration: " + this.options.config);
            onComplete(1);
            return;
        }

        // if both files and tsconfig are present, use files
        let files = this.options.files;
        let program: ts.Program;

        if (this.options.project != null) {
            if (!fs.existsSync(this.options.project)) {
                console.error("Invalid option for project: " + this.options.project);
                onComplete(1);
                return;
            }

            program = Linter.createProgram(this.options.project, path.dirname(this.options.project));

            if (files.length === 0) {
                files = Linter.getFileNames(program);
            }

            if (this.options.typeCheck) {
                // if type checking, run the type checker
                const diagnostics = ts.getPreEmitDiagnostics(program);
                if (diagnostics.length > 0) {
                    const messages = diagnostics.map((diag) => {
                        // emit any error messages
                        let message = ts.DiagnosticCategory[diag.category];
                        if (diag.file) {
                            const {line, character} = diag.file.getLineAndCharacterOfPosition(diag.start);
                            message += ` at ${diag.file.fileName}:${line + 1}:${character + 1}:`;
                        }
                        message += " " + ts.flattenDiagnosticMessageText(diag.messageText, "\n");
                        return message;
                    });
                    throw new Error(messages.join("\n"));
                }
            } else {
                // if not type checking, we don't need to pass in a program object
                program = undefined;
            }
        }

        files = files
            .map((file: string) => glob.sync(file, { ignore: this.options.exclude, nodir: true }))
            .reduce((a: string[], b: string[]) => a.concat(b));

        this.processFiles(onComplete, files, program);
    }

    private processFiles(onComplete: (status: number) => void, files: string[], program?: ts.Program) {
        const possibleConfigAbsolutePath = this.options.config != null ? path.resolve(this.options.config) : null;
        const linter = new Linter({
            formatter: this.options.format,
            formattersDirectory: this.options.formattersDirectory || "",
            rulesDirectory: this.options.rulesDirectory || "",
        }, program);

        for (const file of files) {
            if (!fs.existsSync(file)) {
                console.error(`Unable to open file: ${file}`);
                onComplete(1);
                return;
            }

            const buffer = new Buffer(256);
            buffer.fill(0);
            const fd = fs.openSync(file, "r");
            try {
                fs.readSync(fd, buffer, 0, 256, null);
                if (buffer.readInt8(0) === 0x47 && buffer.readInt8(188) === 0x47) {
                    // MPEG transport streams use the '.ts' file extension. They use 0x47 as the frame
                    // separator, repeating every 188 bytes. It is unlikely to find that pattern in
                    // TypeScript source, so tslint ignores files with the specific pattern.
                    console.warn(`${file}: ignoring MPEG transport stream`);
                    return;
                }
            } finally {
                fs.closeSync(fd);
            }

            const contents = fs.readFileSync(file, "utf8");
            const configuration = findConfiguration(possibleConfigAbsolutePath, file);
            console.log("configuration:", configuration);
            linter.lint(file, contents, configuration);
        }

        const lintResult = linter.getResult();

        this.outputStream.write(lintResult.output, () => {
            if (lintResult.failureCount > 0) {
                onComplete(this.options.force ? 0 : 2);
            }
        });
    };
}
