# Severity Model Evaluation Report

**Model version:** severity-v1

## Classification Report

```
              precision    recall  f1-score   support

         low       1.00      1.00      1.00       240
      medium       1.00      1.00      1.00       360
        high       1.00      1.00      1.00       360
    critical       1.00      1.00      1.00       240

    accuracy                           1.00      1200
   macro avg       1.00      1.00      1.00      1200
weighted avg       1.00      1.00      1.00      1200

```

## Key Metrics

| Metric | Value |
|---|---|
| Macro-F1 | 1.0000 |
| Critical Recall | 1.0000 |
| Critical False Negatives | 0 |
| High+Critical Recall | 1.0000 |

## Confusion Matrix

Labels: low, medium, high, critical

```
[[240   0   0   0]
 [  0 360   0   0]
 [  0   0 360   0]
 [  0   0   0 240]]
```

**Note:** Safety rules are applied post-prediction. Critical recall above does not reflect safety-rule corrections.
