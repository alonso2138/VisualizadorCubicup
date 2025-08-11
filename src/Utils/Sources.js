export default [
    {
        name: 'envMap',
        type: 'cubeTexture',
        path:
        [
            'envMap/px.jpg',
            'envMap/nx.jpg',
            'envMap/py.jpg',
            'envMap/ny.jpg',
            'envMap/pz.jpg',
            'envMap/nz.jpg'
        ]
    },
    {
        name: 'modeloBase',
        type: 'gltfModel',
        path: 'models/bano/bano.glb'
    },
    // Texturas aquí
    {
        name: 'marmol_Color',
        type: 'texture',
        path: 'models/mono/texturas/marmol/color.jpg'
    },
    {
        name: 'marmol_Normal',
        type: 'texture',
        path: 'models/mono/texturas/marmol/normal.jpg'
    },
    {
        name: 'marmol_Displacement',
        type: 'texture',
        path: 'models/mono/texturas/marmol/displacement.jpg'
    },
    {
        name: 'metal_Color',
        type: 'texture',
        path: 'models/mono/texturas/metal/color.jpg'
    },
    {
        name: 'metal_Normal',
        type: 'texture',
        path: 'models/mono/texturas/metal/normal.jpg'
    },
    {
        name: 'metal_Roughness',
        type: 'texture',
        path: 'models/mono/texturas/metal/roughness.jpg'
    },
    {
        name: 'madera_Color',
        type: 'texture',
        path: 'models/mono/texturas/madera/color.jpg'
    },
    {
        name: 'madera_Normal',
        type: 'texture',
        path: 'models/mono/texturas/madera/normal.jpg'
    },
    {
        name: 'madera_Roughness',
        type: 'texture',
        path: 'models/mono/texturas/madera/roughness.jpg'
    }
]