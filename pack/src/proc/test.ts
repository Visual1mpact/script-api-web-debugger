import * as gt from '@minecraft/server-gametest'

gt.register("debugger", "spawndummy", (test) => {
    const spawnLoc = {x: 1, y: 2, z: 1};
    test.spawnSimulatedPlayer(spawnLoc, `Dummy`);

    test.succeedWhen(() => test.assertBlockPresent('minecraft:air', spawnLoc, false));
    test.succeedOnTick(2147483627);
})
    .maxTicks(2147483647)
    .structureName("gametest:platformdummy");

gt.register("debugger", "spawn3dummy", (test) => {
    const spawnLoc = {x: 1, y: 2, z: 1};
    for (let i = 0; i < 3; i++) test.spawnSimulatedPlayer(spawnLoc, `Dummy-${i+1}`);

    test.succeedWhen(() => test.assertBlockPresent('minecraft:air', spawnLoc, false));
    test.succeedOnTick(2147483627);
})
    .maxTicks(2147483647)
    .structureName("gametest:platformdummy");

gt.register("debugger", "spawn8dummy", (test) => {
    const spawnLoc = {x: 1, y: 2, z: 1};
    for (let i = 0; i < 8; i++) test.spawnSimulatedPlayer(spawnLoc, `Dummy-${i+1}`);

    test.succeedWhen(() => test.assertBlockPresent('minecraft:air', spawnLoc, false));
    test.succeedOnTick(2147483627);
})
    .maxTicks(2147483647)
    .structureName("gametest:platformdummy");
