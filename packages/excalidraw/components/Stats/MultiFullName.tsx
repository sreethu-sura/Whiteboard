import { mutateElement } from "../../element/mutateElement";
import type { ExcalidrawElement } from "../../element/types";
import type Scene from "../../scene/Scene";
import type { AppState } from "../../types";
import { isPropertyEditable } from "./utils";
import DragInput from "./DragInput";
import type { DragInputCallbackType } from "./DragInput";
import { CustomDataIcon } from "../icons";
import { isInGroup } from "../../groups";

interface MultiFullNameProps {
  elements: readonly ExcalidrawElement[];
  scene: Scene;
  appState: AppState;
  property: "full_name";
}

const handleFullNameChange: DragInputCallbackType<MultiFullNameProps["property"]> = ({
  nextValue,
  originalElements,
  scene,
}) => {
  const elementsMap = scene.getNonDeletedElementsMap();
  const editableLatestElements = originalElements
    .map((el) => elementsMap.get(el.id))
    .filter((el) => el && !isInGroup(el) && isPropertyEditable(el, "full_name"));

  if (nextValue !== undefined) {
    for (const element of editableLatestElements) {
      if (!element) continue;
      mutateElement(element, {
        full_name: String(nextValue), // Ensure value is always a string
      });
    }
    scene.triggerUpdate();
  }
};

const MultiFullName = ({
  elements,
  scene,
  appState,
  property,
}: MultiFullNameProps) => {
  const editableElements = elements.filter(
    (el) => !isInGroup(el) && isPropertyEditable(el, "full_name"),
  );

  // Collect full_name values
  const fullNames = editableElements.map((el) => el.full_name || "");
  const value = new Set(fullNames).size === 1 ? fullNames[0] : "Mixed";

  const editable = editableElements.some((el) => isPropertyEditable(el, "full_name"));

  return (
    <DragInput
      label="Model"
      icon={CustomDataIcon}
      value={value}
      elements={elements}
      dragInputCallback={handleFullNameChange}
      editable={editable}
      appState={appState}
      scene={scene}
      property={property}
    />
  );
};

export default MultiFullName;
