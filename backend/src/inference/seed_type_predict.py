import json
import sys
import numpy as np
from PIL import Image
from tensorflow.keras.models import load_model

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

def main():
    model_path = sys.argv[1]
    model = load_model(model_path, compile=False)
    model.predict(np.zeros((1, 224, 224, 3), dtype=np.float32), verbose=0)
    if len(sys.argv) > 2 and sys.argv[2] == '--worker':
        print(json.dumps({'ready': True}), flush=True)
        for line in sys.stdin:
            request = json.loads(line)
            try:
                result = predict(model, request['imagePath'])
                result['requestId'] = request['requestId']
                print(json.dumps(result), flush=True)
            except Exception as error:
                print(json.dumps({'requestId': request['requestId'], 'error': str(error)}), flush=True)
        return
    image_path = sys.argv[2]
    print(json.dumps(predict(model, image_path)))

def predict(model, image_path):
    image = Image.open(image_path).convert('RGB').resize((224, 224))
    array = np.asarray(image, dtype=np.float32) / 255.0
    prediction = model.predict(np.expand_dims(array, axis=0), verbose=0)[0]
    index = int(np.argmax(prediction))
    return {'seedType': MODEL_CLASSES[index], 'confidence': round(float(prediction[index]) * 100, 2)}

if __name__ == '__main__':
    main()
