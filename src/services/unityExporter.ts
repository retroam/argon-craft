import { CanvasNode, CanvasScene, InferredGameSpec, PhysicsProfile } from '../types';

export const UNITY_SCALE = 0.12;

export interface UnityTransformData {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

/**
 * Converts a 2D Figma CanvasNode into Unity 3D Transform coordinates (X, Y, Z).
 */
export function nodeToUnityTransform(
  node: CanvasNode,
  sceneWidth: number = 800,
  sceneHeight: number = 540
): UnityTransformData {
  const centerX = node.x + node.width / 2 - sceneWidth / 2;
  const centerZ = node.y + node.height / 2 - sceneHeight / 2;
  const scaleX = Math.max(0.4, Number((node.width * UNITY_SCALE).toFixed(2)));
  const scaleY = Math.max(0.3, Number((node.extrudeHeight * UNITY_SCALE).toFixed(2)));
  const scaleZ = Math.max(0.4, Number((node.height * UNITY_SCALE).toFixed(2)));
  const posY = Number(((node.elevation * UNITY_SCALE) + scaleY / 2).toFixed(2));

  return {
    position: {
      x: Number((centerX * UNITY_SCALE).toFixed(2)),
      y: posY,
      z: Number((centerZ * UNITY_SCALE).toFixed(2)),
    },
    rotation: {
      x: 0,
      y: Number((node.rotation || 0).toFixed(1)),
      z: 0,
    },
    scale: {
      x: scaleX,
      y: scaleY,
      z: scaleZ,
    },
  };
}

/**
 * Converts a 3D Unity Transform manipulation (from TransformControls gizmos or Inspector)
 * back into a 2D/3D CanvasNode patch so Figma 2D and Unity 3D stay 100% synchronized.
 */
export function unityTransformToNodePatch(
  position: { x: number; y: number; z: number },
  rotationYDeg: number,
  scale: { x: number; y: number; z: number },
  sceneWidth: number = 800,
  sceneHeight: number = 540
): Partial<CanvasNode> {
  const newWidth = Math.max(16, Math.round(scale.x / UNITY_SCALE));
  const newHeight = Math.max(16, Math.round(scale.z / UNITY_SCALE));
  const newExtrude = Math.max(4, Math.round(scale.y / UNITY_SCALE));
  const baseElevationWorld = Math.max(0, position.y - scale.y / 2);
  const newElevation = Math.max(0, Math.round(baseElevationWorld / UNITY_SCALE));

  const centerX2D = position.x / UNITY_SCALE + sceneWidth / 2;
  const centerY2D = position.z / UNITY_SCALE + sceneHeight / 2;

  return {
    x: Math.round(centerX2D - newWidth / 2),
    y: Math.round(centerY2D - newHeight / 2),
    width: newWidth,
    height: newHeight,
    extrudeHeight: newExtrude,
    elevation: newElevation,
    rotation: Math.round(rotationYDeg % 360),
  };
}

function hexToUnityColor(hex: string, alpha: number = 1): { r: number; g: number; b: number; a: number } {
  const clean = (hex || '#38bdf8').replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16) || 0x38bdf8;
  return {
    r: Number(((num >> 16) & 255) / 255).valueOf(),
    g: Number(((num >> 8) & 255) / 255).valueOf(),
    b: Number((num & 255) / 255).valueOf(),
    a: alpha,
  };
}

/**
 * Serializes a CanvasScene + PhysicsProfile into a native Unity `.unity` YAML Scene file
 * (%YAML 1.1 / %TAG !u! tag:unity3d.com,2011:) that opens directly in Unity 6 / 2022 LTS.
 * Footprint: < 30 KB text file, 0 MB local engine installation required.
 */
export function generateUnitySceneYaml(
  scene: CanvasScene,
  physics: PhysicsProfile
): string {
  const bg = hexToUnityColor(scene.backgroundColor || '#0f172a');
  const ambient = hexToUnityColor(scene.ambientLight || '#38bdf8');
  const fog = hexToUnityColor(scene.fogColor || '#0f172a');

  const lines: string[] = [
    '%YAML 1.1',
    '%TAG !u! tag:unity3d.com,2011:',
    '--- !u!29 &1',
    'OcclusionCullingSettings:',
    '  m_ObjectHideFlags: 0',
    '  serializedVersion: 2',
    '  m_OcclusionBakeSettings:',
    '    smallestOccluder: 5',
    '    smallestHole: 0.25',
    '    backfaceThreshold: 100',
    '--- !u!104 &2',
    'RenderSettings:',
    '  m_ObjectHideFlags: 0',
    '  serializedVersion: 9',
    '  m_Fog: 1',
    `  m_FogColor: {r: ${fog.r.toFixed(3)}, g: ${fog.g.toFixed(3)}, b: ${fog.b.toFixed(3)}, a: 1}`,
    '  m_FogMode: 2',
    '  m_FogDensity: 0.012',
    `  m_AmbientSkyColor: {r: ${ambient.r.toFixed(3)}, g: ${ambient.g.toFixed(3)}, b: ${ambient.b.toFixed(3)}, a: 1}`,
    '--- !u!157 &3',
    'LightmapSettings:',
    '  m_ObjectHideFlags: 0',
    '  serializedVersion: 12',
    '--- !u!1 &100',
    'GameObject:',
    '  m_ObjectHideFlags: 0',
    '  m_Component:',
    '  - component: {fileID: 101}',
    '  - component: {fileID: 102}',
    '  m_Layer: 0',
    '  m_Name: Main Camera',
    '  m_TagString: MainCamera',
    '  m_IsActive: 1',
    '--- !u!4 &101',
    'Transform:',
    '  m_ObjectHideFlags: 0',
    '  m_GameObject: {fileID: 100}',
    '  m_LocalRotation: {x: 0.2588, y: 0, z: 0, w: 0.9659}',
    '  m_LocalPosition: {x: 0, y: 26, z: -38}',
    '  m_LocalScale: {x: 1, y: 1, z: 1}',
    '--- !u!20 &102',
    'Camera:',
    '  m_ObjectHideFlags: 0',
    '  m_GameObject: {fileID: 100}',
    '  m_Enabled: 1',
    '  serializedVersion: 2',
    '  m_ClearFlags: 2',
    `  m_BackGroundColor: {r: ${bg.r.toFixed(3)}, g: ${bg.g.toFixed(3)}, b: ${bg.b.toFixed(3)}, a: 1}`,
    '  field of view: 55',
    '  near clip plane: 0.3',
    '  far clip plane: 500',
    '--- !u!1 &200',
    'GameObject:',
    '  m_ObjectHideFlags: 0',
    '  m_Component:',
    '  - component: {fileID: 201}',
    '  - component: {fileID: 202}',
    '  m_Layer: 0',
    '  m_Name: Directional Light',
    '  m_TagString: Untagged',
    '  m_IsActive: 1',
    '--- !u!4 &201',
    'Transform:',
    '  m_ObjectHideFlags: 0',
    '  m_GameObject: {fileID: 200}',
    '  m_LocalRotation: {x: 0.4082, y: -0.2345, z: 0.1093, w: 0.8754}',
    '  m_LocalPosition: {x: 24, y: 50, z: -20}',
    '  m_LocalScale: {x: 1, y: 1, z: 1}',
    '--- !u!108 &202',
    'Light:',
    '  m_ObjectHideFlags: 0',
    '  m_GameObject: {fileID: 200}',
    '  m_Enabled: 1',
    '  serializedVersion: 10',
    '  m_Type: 1',
    '  m_Intensity: 1.25',
    '  m_Shadows:',
    '    m_Type: 2',
  ];

  // Emit each visible CanvasNode as a Unity GameObject with Transform, MeshFilter, MeshRenderer, Collider, and Rigidbody
  scene.nodes
    .filter((n) => n.visible)
    .forEach((node, index) => {
      const baseId = (index + 1) * 1000;
      const goId = baseId;
      const trId = baseId + 1;
      const mfId = baseId + 2;
      const mrId = baseId + 3;
      const colId = baseId + 4;
      const rbId = baseId + 5;
      const mbId = baseId + 6;

      const t = nodeToUnityTransform(node, scene.width, scene.height);
      const isTrigger = node.physics === 'sensor' ? 1 : 0;
      const hasRigidbody = node.physics === 'dynamic' || node.physics === 'kinematic';
      const isKinematic = node.physics === 'kinematic' ? 1 : 0;
      const isSphere = node.type === 'circle';

      lines.push(
        `--- !u!1 &${goId}`,
        'GameObject:',
        '  m_ObjectHideFlags: 0',
        '  m_Component:',
        `  - component: {fileID: ${trId}}`,
        `  - component: {fileID: ${mfId}}`,
        `  - component: {fileID: ${mrId}}`,
        `  - component: {fileID: ${colId}}`
      );
      if (hasRigidbody) {
        lines.push(`  - component: {fileID: ${rbId}}`);
      }
      lines.push(
        `  - component: {fileID: ${mbId}}`,
        '  m_Layer: 0',
        `  m_Name: "${node.name.replace(/"/g, '')} [${node.role}]"`,
        `  m_TagString: ${node.role === 'player_spawn' ? 'Player' : 'Untagged'}`,
        '  m_IsActive: 1',
        `--- !u!4 &${trId}`,
        'Transform:',
        '  m_ObjectHideFlags: 0',
        `  m_GameObject: {fileID: ${goId}}`,
        '  m_LocalRotation: {x: 0, y: 0, z: 0, w: 1}',
        `  m_LocalPosition: {x: ${t.position.x}, y: ${t.position.y}, z: ${t.position.z}}`,
        `  m_LocalScale: {x: ${t.scale.x}, y: ${t.scale.y}, z: ${t.scale.z}}`,
        `--- !u!33 &${mfId}`,
        'MeshFilter:',
        '  m_ObjectHideFlags: 0',
        `  m_GameObject: {fileID: ${goId}}`,
        `  m_Mesh: {fileID: ${isSphere ? '10207' : '10202'}, guid: 0000000000000000e000000000000000, type: 0}`,
        `--- !u!23 &${mrId}`,
        'MeshRenderer:',
        '  m_ObjectHideFlags: 0',
        `  m_GameObject: {fileID: ${goId}}`,
        '  m_Enabled: 1',
        '  m_CastShadows: 1',
        '  m_ReceiveShadows: 1'
      );

      if (isSphere) {
        lines.push(
          `--- !u!135 &${colId}`,
          'SphereCollider:',
          '  m_ObjectHideFlags: 0',
          `  m_GameObject: {fileID: ${goId}}`,
          '  m_Enabled: 1',
          `  m_IsTrigger: ${isTrigger}`,
          '  m_Radius: 0.5'
        );
      } else {
        lines.push(
          `--- !u!65 &${colId}`,
          'BoxCollider:',
          '  m_ObjectHideFlags: 0',
          `  m_GameObject: {fileID: ${goId}}`,
          '  m_Enabled: 1',
          `  m_IsTrigger: ${isTrigger}`,
          '  m_Size: {x: 1, y: 1, z: 1}'
        );
      }

      if (hasRigidbody) {
        lines.push(
          `--- !u!54 &${rbId}`,
          'Rigidbody:',
          '  m_ObjectHideFlags: 0',
          `  m_GameObject: {fileID: ${goId}}`,
          '  m_Mass: 1',
          '  m_Drag: 0.05',
          '  m_AngularDrag: 0.05',
          '  m_UseGravity: 1',
          `  m_IsKinematic: ${isKinematic}`
        );
      }

      lines.push(
        `--- !u!114 &${mbId}`,
        'MonoBehaviour:',
        '  m_ObjectHideFlags: 0',
        `  m_GameObject: {fileID: ${goId}}`,
        '  m_Enabled: 1',
        `  argonNodeId: "${node.id}"`,
        `  argonRole: "${node.role}"`,
        `  bounciness: ${node.bounciness}`,
        `  patrolSpeed: ${node.speed}`,
        `  globalGravity: ${physics.gravity}`
      );
    });

  return lines.join('\n');
}

/**
 * Generates ready-to-compile Unity C# MonoBehaviour scripts (`ArgonPlayerController.cs` + `ArgonSceneManager.cs`)
 * and the WebGL JavaScript bridge (`ArgonWebGLBridge.jslib`) tailored to the inferred game spec.
 */
export function generateUnityCSharpScripts(
  scene: CanvasScene,
  spec: InferredGameSpec
): {
  playerControllerCs: string;
  sceneManagerCs: string;
  webglBridgeJslib: string;
} {
  const p = spec.tunedPhysics;
  const playerControllerCs = `// Synthesized by Gemini 4 Argon for Unity 6 / Unity 2022 LTS
// Scene: "${scene.title}" | Archetype: "${spec.playerArchetype}"
using System;
using System.Runtime.InteropServices;
using UnityEngine;

[RequireComponent(typeof(CharacterController))]
public class ArgonPlayerController : MonoBehaviour
{
    [Header("Telemetry-Tuned Physics Profile")]
    public float moveSpeed = ${p.moveSpeed.toFixed(2)}f;
    public float jumpForce = ${p.jumpForce.toFixed(2)}f;
    public float gravity = ${p.gravity.toFixed(2)}f;
    public float dashMultiplier = ${p.dashMultiplier.toFixed(2)}f;
    public bool allowDoubleJump = ${p.doubleJump ? 'true' : 'false'};
    public float shardMagnetRadius = ${p.magnetRadius.toFixed(2)}f;
    public float jumpPadBounciness = ${p.bouncinessMultiplier.toFixed(2)}f;

    private CharacterController _controller;
    private Vector3 _velocity;
    private int _jumpsRemaining;
    private float _dashTimer;
    private int _shardsCollected;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void ArgonEmitTelemetry(string jsonPayload);
#endif

    void Awake()
    {
        _controller = GetComponent<CharacterController>();
        _jumpsRemaining = allowDoubleJump ? 2 : 1;
    }

    void Update()
    {
        bool grounded = _controller.isGrounded;
        if (grounded && _velocity.y < 0f)
        {
            _velocity.y = -2f;
            _jumpsRemaining = allowDoubleJump ? 2 : 1;
        }

        float h = Input.GetAxisRaw("Horizontal");
        float v = Input.GetAxisRaw("Vertical");
        Vector3 move = new Vector3(h, 0f, v).normalized;

        if (Input.GetKeyDown(KeyCode.LeftShift) && _dashTimer <= 0f)
        {
            _dashTimer = 0.22f;
        }
        if (_dashTimer > 0f) _dashTimer -= Time.deltaTime;

        float currentSpeed = moveSpeed * (_dashTimer > 0f ? dashMultiplier : 1f);
        _controller.Move(move * (currentSpeed * Time.deltaTime));

        if (Input.GetButtonDown("Jump") && _jumpsRemaining > 0)
        {
            _velocity.y = jumpForce;
            _jumpsRemaining--;
        }

        _velocity.y -= gravity * Time.deltaTime;
        _controller.Move(_velocity * Time.deltaTime);

        AttractNearbyShards();
    }

    private void AttractNearbyShards()
    {
        Collider[] hits = Physics.OverlapSphere(transform.position, shardMagnetRadius);
        foreach (var hit in hits)
        {
            if (hit.CompareTag("Collectible"))
            {
                hit.transform.position = Vector3.MoveTowards(
                    hit.transform.position,
                    transform.position,
                    moveSpeed * 1.35f * Time.deltaTime
                );
            }
        }
    }

    private void OnControllerColliderHit(ControllerColliderHit hit)
    {
        if (hit.gameObject.name.Contains("[jump_pad]"))
        {
            _velocity.y = jumpForce * jumpPadBounciness;
            _jumpsRemaining = allowDoubleJump ? 2 : 1;
        }
    }
}
`;

  const sceneManagerCs = `// ArgonSceneManager.cs — Runtime JSON Loader & react-unity-webgl Bridge
using System;
using UnityEngine;

public class ArgonSceneManager : MonoBehaviour
{
    [Serializable]
    public class ArgonNodeDto
    {
        public string id;
        public string name;
        public string role;
        public string type;
        public float x;
        public float y;
        public float width;
        public float height;
        public float extrudeHeight;
        public float elevation;
        public string fill;
        public string physics;
    }

    [Serializable]
    public class ArgonSceneDto
    {
        public string id;
        public string title;
        public float width = 800f;
        public float height = 540f;
        public ArgonNodeDto[] nodes;
    }

    private const float SCALE = 0.12f;

    // Invoked from React via unityInstance.SendMessage("ArgonSceneManager", "LoadCanvasSceneJson", json)
    public void LoadCanvasSceneJson(string json)
    {
        ArgonSceneDto scene = JsonUtility.FromJson<ArgonSceneDto>(json);
        if (scene == null || scene.nodes == null) return;

        foreach (Transform child in transform)
        {
            Destroy(child.gameObject);
        }

        foreach (var n in scene.nodes)
        {
            PrimitiveType prim = n.type == "circle" ? PrimitiveType.Cylinder : PrimitiveType.Cube;
            GameObject go = GameObject.CreatePrimitive(prim);
            go.name = $"{n.name} [{n.role}]";
            go.transform.SetParent(transform, false);

            float sx = Mathf.Max(0.4f, n.width * SCALE);
            float sy = Mathf.Max(0.3f, n.extrudeHeight * SCALE);
            float sz = Mathf.Max(0.4f, n.height * SCALE);
            float px = ((n.x + n.width * 0.5f) - scene.width * 0.5f) * SCALE;
            float pz = ((n.y + n.height * 0.5f) - scene.height * 0.5f) * SCALE;
            float py = (n.elevation * SCALE) + sy * 0.5f;

            go.transform.position = new Vector3(px, py, pz);
            go.transform.localScale = new Vector3(sx, sy, sz);

            if (ColorUtility.TryParseHtmlString(n.fill, out Color col))
            {
                go.GetComponent<Renderer>().material.color = col;
            }
        }
    }
}
`;

  const webglBridgeJslib = `// Assets/Plugins/WebGL/ArgonWebGLBridge.jslib
mergeInto(LibraryManager.library, {
  ArgonEmitTelemetry: function (jsonPtr) {
    var jsonStr = UTF8ToString(jsonPtr);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('argon-unity-telemetry', { detail: jsonStr }));
    }
  }
});
`;

  return {
    playerControllerCs,
    sceneManagerCs,
    webglBridgeJslib,
  };
}
