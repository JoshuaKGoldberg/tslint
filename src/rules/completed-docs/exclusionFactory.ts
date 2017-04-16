/**
 * @license
 * Copyright 2013 Palantir Technologies, Inc.
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

import { DocType } from "../completedDocsRule";
import { BlockExclusion } from "./blockExclusion";
import { ClassExclusion } from "./classExclusion";
import { IExclusion } from "./exclusion";
import { ExclusionDescriptor, IExclusionDescriptors } from "./exclusionDescriptors";
import { ITagExclusionDescriptor, TagExclusion } from "./tagExclusion";

export class ExclusionFactory {
    public constructExclusionsMap(ruleArguments: Array<DocType | IExclusionDescriptors>): Map<DocType, IExclusion[]> {
        const exclusionsMap: Map<DocType, IExclusion[]> = new Map();

        for (const ruleArgument of ruleArguments) {
            this.addRequirements(exclusionsMap, ruleArgument);
        }

        return exclusionsMap;
    }

    private addRequirements(requirementsMap: Map<DocType, IExclusion[]>, descriptors: DocType | IExclusionDescriptors) {
        if (typeof descriptors === "string") {
            requirementsMap.set(descriptors, this.createExclusionsForDocType(descriptors, {}));
        } else {
            for (const docType in descriptors) {
                if (descriptors.hasOwnProperty(docType)) {
                    requirementsMap.set(docType as DocType, this.createExclusionsForDocType(docType as DocType, descriptors[docType]));
                }
            }
        }
    }

    private createExclusionsForDocType(docType: DocType, descriptor: ExclusionDescriptor) {
        const exclusions: IExclusion[] = [];

        if (docType === "methods" || docType === "properties") {
            exclusions.push(new ClassExclusion(descriptor));
        } else {
            exclusions.push(new BlockExclusion(descriptor));
        }

        if ((descriptor as ITagExclusionDescriptor).tags) {
            exclusions.push(new TagExclusion(descriptor));
        }

        return exclusions;
    }
}
