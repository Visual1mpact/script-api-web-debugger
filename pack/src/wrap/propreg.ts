import { DynamicPropertiesDefinition, Entity, PropertyRegistry, world, World } from "@minecraft/server";
import Debugger from "../lib/debugger.js";
import eventListeners from "./event.js";

const defList = new WeakMap<DynamicPropertiesDefinition, Map<string, Bedrock.T_DynamicPropertyData>>()

const { defineBoolean: obool, defineNumber: onum, defineString: ostr, defineVector: ovec } = DynamicPropertiesDefinition.prototype

DynamicPropertiesDefinition.prototype.defineBoolean = function(id, def) {
    if (!(this instanceof DynamicPropertiesDefinition)) throw new ReferenceError(`illegal bound`)

    obool.call(this, id, def)

    let list = defList.get(this)
    if (!list) defList.set(this, list = new Map)
    list.set(id, {
        type: 'boolean',
        default: def
    })

    return this
}

DynamicPropertiesDefinition.prototype.defineNumber = function(id, def) {
    if (!(this instanceof DynamicPropertiesDefinition)) throw new ReferenceError(`illegal bound`)

    onum.call(this, id, def)

    let list = defList.get(this)
    if (!list) defList.set(this, list = new Map)
    list.set(id, {
        type: 'number',
        default: def
    })

    return this
}

DynamicPropertiesDefinition.prototype.defineString = function(id, maxLength, def) {
    if (!(this instanceof DynamicPropertiesDefinition)) throw new ReferenceError(`illegal bound`)

    ostr.call(this, id, maxLength, def)

    let list = defList.get(this)
    if (!list) defList.set(this, list = new Map)
    list.set(id, {
        type: 'string',
        maxLength,
        default: def
    })

    return this
}

DynamicPropertiesDefinition.prototype.defineVector = function(id, def) {
    if (!(this instanceof DynamicPropertiesDefinition)) throw new ReferenceError(`illegal bound`)

    ovec.call(this, id, def)

    let list = defList.get(this)
    if (!list) defList.set(this, list = new Map)
    list.set(id, {
        type: 'vector',
        default: def
    })

    return this
}

const regEntList = new Map<string, Map<string, Bedrock.T_DynamicPropertyData>>()
const regWldList = new Map<string, Bedrock.T_DynamicPropertyData>()

const { registerEntityTypeDynamicProperties: oregEnt, registerWorldDynamicProperties: oregWld } = PropertyRegistry.prototype

PropertyRegistry.prototype.registerEntityTypeDynamicProperties = function(def, t) {
    if (!(this instanceof PropertyRegistry)) throw new ReferenceError(`illegal bound`)

    oregEnt.call(this, def, t)

    const id = typeof t === 'string' ? t : t.id
    let reg = regEntList.get(id)
    if (!reg) regEntList.set(id, reg = new Map)
    for (const [k, v] of defList.get(def) ?? []) reg.set(k, v)
}

PropertyRegistry.prototype.registerWorldDynamicProperties = function(def) {
    if (!(this instanceof PropertyRegistry)) throw new ReferenceError(`illegal bound`)

    oregWld.call(this, def)
    
    for (const [k, v] of defList.get(def) ?? []) regWldList.set(k, v)
}

const { setDynamicProperty: wldSet, removeDynamicProperty: wldRm } = World.prototype

World.prototype.setDynamicProperty = function(id, value) {
    if (!(this instanceof World)) throw new ReferenceError(`illegal bound`)

    wldSet.call(this, id, value)

    Debugger.send('property_set', {
        type: 'world',
        property: id,
        value
    })
}

World.prototype.removeDynamicProperty = function(id) {
    if (!(this instanceof World)) throw new ReferenceError(`illegal bound`)

    const v = wldRm.call(this, id)
    if (!v) return false

    Debugger.send('property_set', {
        type: 'world',
        property: id,
        value: undefined
    })

    return v
}

const { setDynamicProperty: entSet, removeDynamicProperty: entRm } = Entity.prototype

Entity.prototype.setDynamicProperty = function(id, value) {
    if (!(this instanceof Entity)) throw new ReferenceError(`illegal bound`)

    entSet.call(this, id, value)

    Debugger.send('property_set', {
        type: 'entity',
        entityId: this.id,
        entityType: this.typeId,

        property: id,
        value
    })
}

Entity.prototype.removeDynamicProperty = function(id) {
    if (!(this instanceof Entity)) throw new ReferenceError(`illegal bound`)

    const v = entRm.call(this, id)
    if (!v) return false

    Debugger.send('property_set', {
        type: 'entity',
        entityId: this.id,
        entityType: this.typeId,

        property: id,
        value: undefined
    })

    return v
}

eventListeners.world_after.worldInitialize.subscribeInternal(async function self() {
    await null
    eventListeners.world_after.worldInitialize.unsubscribeInternal(self)

    Debugger.send('property_registry', {
        world: Array.from(regWldList),
        entities: Array.from(regEntList, ([k, v]) => [k, Array.from(v)] as [string, [string, Bedrock.T_DynamicPropertyData][]]),
        worldInitProperties: dynamicProperties.getAllWorld()
    })
})

const dynamicProperties = {
    world: regWldList,
    entities: regEntList,

    getAllWorld() {
        const list: Record<string, Bedrock.T_DynamicPropertyValue> = Object.create(null)
        for (const k of regWldList.keys()) list[k] = world.getDynamicProperty(k)
        return list
    },

    getAllEntity(ent: Entity) {
        const l = regEntList.get(ent.typeId)
        if (!l) return undefined

        const list: Record<string, Bedrock.T_DynamicPropertyValue> = Object.create(null)
        for (const k of l.keys()) list[k] = ent.getDynamicProperty(k)
        return list
    }
}
export default dynamicProperties
