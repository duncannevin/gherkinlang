const { ProjectContext } = require('./src/compiler/context');


async function main() {
    try {
        const pc = new ProjectContext();
        await pc.build('features/examples/project');
        console.log('graph', pc._graph);
        console.log('modules', pc._modules);
        console.log('cycles', pc.detectCycles());
        console.log('compileOrder', pc.getCompilerOrder());
    } catch (error) {
        console.error(error);
    }
}

main().catch(error => {
    console.error(error);
});
