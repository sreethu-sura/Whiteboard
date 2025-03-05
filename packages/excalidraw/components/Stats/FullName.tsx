import { mutateElement } from "../../element/mutateElement";
import type { ExcalidrawElement } from "../../element/types";
import type Scene from "../../scene/Scene";
import type { AppState } from "../../types";
import { isPropertyEditable } from "./utils";
import DragInput from "./DragInput";
import type { DragInputCallbackType } from "./DragInput";
import { CustomDataIcon } from "../icons";

interface FullNameProps {
  element: ExcalidrawElement;
  scene: Scene;
  appState: AppState;
  property: "full_name";
}

const handleFullNameChange: DragInputCallbackType<FullNameProps["property"]> = ({
  nextValue,
  originalElements,
  scene,
}) => {
  const elementsMap = scene.getNonDeletedElementsMap();
  const origElement = originalElements[0];

  if (origElement) {
    const latestElement = elementsMap.get(origElement.id);
    if (!latestElement) {
      return;
    }

    if (nextValue !== undefined) {
      mutateElement(latestElement, {
        full_name: String(nextValue), // Ensure it's treated as a string
      });
    }
  }
};

const FullName = ({ element, scene, appState, property }: FullNameProps) => {
  return (
    <DragInput
      label="Model"
      icon={CustomDataIcon}
      value={element.full_name || ""}
      elements={[element]}
      dragInputCallback={handleFullNameChange}
      editable={isPropertyEditable(element, "full_name")}
      scene={scene}
      appState={appState}
      property={property}
    />
  );
};

export default FullName;
