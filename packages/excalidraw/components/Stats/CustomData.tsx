import { mutateElement } from "../../element/mutateElement";
import type { ExcalidrawElement } from "../../element/types";
import { angleIcon } from "../icons"; // Ensure an appropriate icon is available
import DragInput from "./DragInput";
import type { DragInputCallbackType } from "./DragInput";
import { isPropertyEditable } from "./utils";
import type Scene from "../../scene/Scene";
import type { AppState } from "../../types";

interface CustomDataProps {
  element: ExcalidrawElement;
  scene: Scene;
  appState: AppState;
  property: "customData";
}

const handleCustomDataChange: DragInputCallbackType<CustomDataProps["property"]> = ({
  nextValue,
  originalElements,
  scene,
}) => {
  const elementsMap = scene.getNonDeletedElementsMap();
  const elements = scene.getNonDeletedElements();
  const origElement = originalElements[0];

  if (origElement) {
    const latestElement = elementsMap.get(origElement.id);
    if (!latestElement) {
      return;
    }

    if (nextValue !== undefined) {
      mutateElement(latestElement, {
        customData: { ...latestElement.customData, value: nextValue }, // Modify structure if necessary
      });
    }
  }
};

const CustomData = ({ element, scene, appState, property }: CustomDataProps) => {
  return (
    <DragInput
      label="Custom Data"
      icon={angleIcon}
      value={element.customData?.value || ""}
      elements={[element]}
      dragInputCallback={handleCustomDataChange}
      editable={isPropertyEditable(element, "customData")}
      scene={scene}
      appState={appState}
      property={property}
    />
  );
};

export default CustomData;
