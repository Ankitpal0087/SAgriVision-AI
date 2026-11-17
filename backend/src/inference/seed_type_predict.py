import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageOps
from tensorflow.keras.models import Model, load_model

MODEL_CLASSES = [
    'Amla Seed',
    'Apple Seed',
    'Avocado Seed',
    'Betel Nut Seed',
    'Black Plum Seed',
    'Corn Seed',
    'Date Seed',
    'Flax Seed',
    'Hog Plum Seed',
    'Jackfruit Seed',
    'Litchi Seed',
    'Mango Seed',
    'Mustard Seed',
    'Olive Seed',
    'Orange Seed',
    'Paddy Seed',
    'Pumpkin Seed',
    'Safflower Seed',
    'Sapodilla Seed',
    'Sesame Seed',
    'Soybean Seed',
    'Sunflower Seed',
    'Tamarind Seed',
    'Wheat Seed',
]

NO_VALID_SEED_MESSAGE = 'No valid seed detected. Please upload a clear image of a supported seed.'
MIN_CONFIDENCE = 0.35
MIN_MEAN_CONFIDENCE = 0.20
MIN_CONFIDENCE_MARGIN = 0.02
MAX_REFERENCE_DISTANCE = 0.23
MIN_IMAGE_CONTRAST = 8.0
MIN_EDGE_MEAN = 2.0


def image_array(image):
    return np.asarray(image.convert('RGB').resize((224, 224)), dtype=np.float32) / 255.0


def build_feature_model(model):
    try:
        return Model(inputs=model.inputs, outputs=model.layers[-3].output)
    except Exception:
        return None


def build_reference_embeddings(feature_model):
    if feature_model is None:
        return {}
    reference_root = Path(__file__).resolve().parents[3] / 'frontend' / 'assets'
    references = {}
    for seed_class in MODEL_CLASSES:
        arrays = []
        class_dir = reference_root / seed_class
        for image_path in class_dir.iterdir() if class_dir.exists() else []:
            if not image_path.is_file():
                continue
            try:
                with Image.open(image_path) as reference_image:
                    arrays.append(image_array(reference_image))
            except Exception:
                continue
        if not arrays:
            continue
        features = feature_model.predict(np.stack(arrays), verbose=0)
        prototype = np.mean(features.reshape(len(features), -1), axis=0)
        references[seed_class] = prototype / (np.linalg.norm(prototype) + 1e-8)
    return references


def nearest_reference_distance(feature, references):
    if not references:
        return None
    vector = feature.reshape(-1)
    vector = vector / (np.linalg.norm(vector) + 1e-8)
    return min(1.0 - float(np.dot(vector, prototype)) for prototype in references.values())


def reject_invalid_seed():
    raise ValueError(NO_VALID_SEED_MESSAGE)

def main():
    model_path = sys.argv[1]
    model = load_model(model_path, compile=False)
    feature_model = build_feature_model(model)
    references = build_reference_embeddings(feature_model)
    model.predict(np.zeros((1, 224, 224, 3), dtype=np.float32), verbose=0)
    if len(sys.argv) > 2 and sys.argv[2] == '--worker':
        print(json.dumps({'ready': True}), flush=True)
        for line in sys.stdin:
            request = json.loads(line)
            try:
                result = predict(model, request['imagePath'], feature_model, references)
                result['requestId'] = request['requestId']
                print(json.dumps(result), flush=True)
            except Exception as error:
                print(json.dumps({'requestId': request['requestId'], 'error': str(error)}), flush=True)
        return
    image_path = sys.argv[2]
    print(json.dumps(predict(model, image_path, feature_model, references)))


def predict(model, image_path, feature_model=None, references=None):
    with Image.open(image_path) as source_image:
        image = source_image.convert('RGB')
    if min(image.size) < 48:
        reject_invalid_seed()

    variants = [image, ImageOps.mirror(image), image.rotate(180)]
    arrays = np.stack([image_array(variant) for variant in variants])
    predictions = model.predict(arrays, verbose=0)
    prediction = predictions[0]
    index = int(np.argmax(prediction))
    confidence = float(prediction[index])
    sorted_prediction = np.sort(prediction)
    margin = float(sorted_prediction[-1] - sorted_prediction[-2])
    ensemble = np.mean(predictions, axis=0)
    ensemble_confidence = float(ensemble[index])
    gray = np.asarray(image.convert('L').resize((224, 224)), dtype=np.float32)
    edge_mean = float(np.asarray(image.convert('L').resize((224, 224)).filter(ImageFilter.FIND_EDGES), dtype=np.float32).mean())
    reference_distance = None
    if feature_model is not None and references:
        feature = feature_model.predict(arrays[:1], verbose=0)[0]
        reference_distance = nearest_reference_distance(feature, references)

    # Reject low-information or out-of-distribution inputs without changing the classifier.
    # The decision combines image quality, model confidence, ensemble behavior, and
    # distance from reference embeddings for the supported seed classes.
    if gray.std() < MIN_IMAGE_CONTRAST or edge_mean < MIN_EDGE_MEAN:
        reject_invalid_seed()
    if confidence < MIN_CONFIDENCE or ensemble_confidence < MIN_MEAN_CONFIDENCE or margin < MIN_CONFIDENCE_MARGIN:
        reject_invalid_seed()
    if reference_distance is not None and reference_distance > MAX_REFERENCE_DISTANCE:
        reject_invalid_seed()

    return {'seedType': MODEL_CLASSES[index], 'confidence': round(confidence * 100, 2)}

if __name__ == '__main__':
    main()
