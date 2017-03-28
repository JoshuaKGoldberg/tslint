/**
 * @license
 * Copyright 2014 Palantir Technologies, Inc.
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

import { IFixGenerator } from "./fixGenerator";
import { fixUtfAssertDoesNotThrow } from "./fixUtfAssertDoesNotThrow";
import { fixUtfAssertEqual } from "./fixUtfAssertEqual";
import { fixUtfAssertFalse } from "./fixUtfAssertFalse";
import { fixUtfAssertNotEqual } from "./fixUtfAssertNotEqual";
import { fixUtfAssertTrue } from "./fixUtfAssertTrue";

export interface IFixGenerators {
    [i: string]: IFixGenerator;
}

export const FixGenerators: IFixGenerators = {
    DoesNotThrow: fixUtfAssertDoesNotThrow,
    Equal: fixUtfAssertEqual,
    False: fixUtfAssertFalse,
    NotEqual: fixUtfAssertNotEqual,
    True: fixUtfAssertTrue,
};
