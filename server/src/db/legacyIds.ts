// Mongo references to documents that were already deleted before the import (e.g. a membership's
// plan) have no row to point at. They are stored as a uuid that embeds the 12-byte ObjectId, so sales
// still group per plan and the value can be traced back to the Mongo id.
const PREFIX = "ffffffff";

export const danglingUuid = (objectId: string) => {
    const hex = objectId.toLowerCase();
    return `${PREFIX}-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 24)}`;
};

export const objectIdFromDanglingUuid = (value: string) => {
    if (!/^ffffffff-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return null;
    return value.slice(9).replace(/-/g, "");
};
