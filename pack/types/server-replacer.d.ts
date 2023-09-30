export {}

declare module '@minecraft/server' {
    type EntityComponents = {
        add_rider: EntityAddRiderComponent,
        ageable: EntityAgeableComponent,
        attribute: EntityAttributeComponent,
        base_movement: EntityBaseMovementComponent,
        breathable: EntityBreathableComponent,
        can_climb: EntityCanClimbComponent,
        can_fly: EntityCanFlyComponent,
        can_power_jump: EntityCanPowerJumpComponent,
        color: EntityColorComponent,
        equippable: EntityEquippableComponent,
        fire_immune: EntityFireImmuneComponent,
        floats_in_liquid: EntityFloatsInLiquidComponent,
        flying_speed: EntityFlyingSpeedComponent,
        friction_modifier: EntityFrictionModifierComponent,
        ground_offset: EntityGroundOffsetComponent,
        healable: EntityHealableComponent,
        health: EntityHealthComponent,
        inventory: EntityInventoryComponent,
        is_baby: EntityIsBabyComponent,
        is_charged: EntityIsChargedComponent,
        is_chested: EntityIsChestedComponent,
        is_hidden_when_invisible: EntityIsHiddenWhenInvisibleComponent,
        is_ignited: EntityIsIgnitedComponent,
        is_illager_captain: EntityIsIllagerCaptainComponent,
        is_saddled: EntityIsSaddledComponent,
        is_shaking: EntityIsShakingComponent,
        is_sheared: EntityIsShearedComponent,
        is_stackable: EntityIsStackableComponent,
        is_stunned: EntityIsStunnedComponent,
        is_tamed: EntityIsTamedComponent,
        item: EntityItemComponent,
        lava_movement: EntityLavaMovementComponent,
        leashable: EntityLeashableComponent,
        mark_variant: EntityMarkVariantComponent,
        mount_taming: EntityMountTamingComponent,
        movement_amphibious: EntityMovementAmphibiousComponent,
        movement_basic: EntityMovementBasicComponent,
        movement: EntityMovementComponent,
        movement_fly: EntityMovementFlyComponent,
        movement_generic: EntityMovementGenericComponent,
        movement_glide: EntityMovementGlideComponent,
        movement_hover: EntityMovementHoverComponent,
        movement_jump: EntityMovementJumpComponent,
        movement_skip: EntityMovementSkipComponent,
        movement_sway: EntityMovementSwayComponent,
        navigation_climb: EntityNavigationClimbComponent,
        navigation: EntityNavigationComponent,
        navigation_float: EntityNavigationFloatComponent,
        navigation_fly: EntityNavigationFlyComponent,
        navigation_generic: EntityNavigationGenericComponent,
        navigation_hover: EntityNavigationHoverComponent,
        navigation_walk: EntityNavigationWalkComponent,
        on_fire: EntityOnFireComponent,
        push_through: EntityPushThroughComponent,
        rideable: EntityRideableComponent,
        riding: EntityRidingComponent,
        scale: EntityScaleComponent,
        skin_id: EntitySkinIdComponent,
        strength: EntityStrengthComponent,
        tameable: EntityTameableComponent,
        underwater_movement: EntityUnderwaterMovementComponent,
        variant: EntityVariantComponent,
        wants_jockey: EntityWantsJockeyComponent
    }

    type BlockComponents = {
        piston: BlockPistonComponent,
        inventory: BlockInventoryComponent,
        lava_container: BlockLavaContainerComponent,
        liquid_container: BlockLiquidContainerComponent,
        potion_container: BlockPotionContainerComponent,
        record_player: BlockRecordPlayerComponent,
        sign: BlockSignComponent,
        snow_container: BlockSnowContainerComponent,
        water_container: BlockWaterContainerComponent
    }

    type ItemComponents = {
        cooldown: ItemCooldownComponent,
        durability: ItemDurabilityComponent,
        enchantments: ItemEnchantsComponent,
        food: ItemFoodComponent
    }

    export interface Entity {
        getComponent<K extends keyof EntityComponents>(name: K): EntityComponents[K]
    }

    export interface Player {
        getComponent<K extends keyof EntityComponents>(name: K): EntityComponents[K]
    }

    export interface Block {
        getComponent<K extends keyof BlockComponents>(name: K): BlockComponents[K]
    }

    export interface ItemStack {
        getComponent<K extends keyof ItemComponents>(name: K): ItemComponents[K]
    }
}
