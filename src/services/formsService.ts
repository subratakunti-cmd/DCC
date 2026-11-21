export interface GoogleFormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  customerName?: string;
  customerMobile?: string;
  cakeFlavor?: string;
  weight?: string;
  deliveryDate?: string;
  cakeMessage?: string;
  notes?: string;
}

export interface GoogleFormDetails {
  formId: string;
  title: string;
  description?: string;
  responderUri: string;
}

/**
 * Creates a complete Bakery Cake Order & Customization form in Google Forms
 */
export async function createBakeryOrderForm(
  accessToken: string,
  shopName: string = 'DELICIOUS CAKE CORNER'
): Promise<GoogleFormDetails> {
  // Step 1: Create Form entity
  const initialRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title: `${shopName} — Custom Cake Booking Form`,
        documentTitle: `${shopName} Order Form`
      }
    })
  });

  if (!initialRes.ok) {
    const err = await initialRes.text();
    throw new Error(`Google Forms creation failed: ${err}`);
  }

  const formData = await initialRes.json();
  const formId = formData.formId;

  // Step 2: Add Questions via batchUpdate
  const batchRequests = [
    {
      createItem: {
        item: {
          title: 'Customer Name / আপনার নাম',
          description: 'Please enter your full name',
          questionItem: {
            question: {
              required: true,
              textQuestion: { paragraph: false }
            }
          }
        },
        location: { index: 0 }
      }
    },
    {
      createItem: {
        item: {
          title: 'Mobile / WhatsApp Number / মোবাইল নম্বর',
          description: '10-digit mobile number for order confirmation',
          questionItem: {
            question: {
              required: true,
              textQuestion: { paragraph: false }
            }
          }
        },
        location: { index: 1 }
      }
    },
    {
      createItem: {
        item: {
          title: 'Select Cake Flavor / কেকের ফ্লেভার',
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: 'RADIO',
                options: [
                  { value: 'Chocolate Truffle Cake' },
                  { value: 'Black Forest Cake' },
                  { value: 'Red Velvet Cake' },
                  { value: 'Butterscotch Crunch Cake' },
                  { value: 'Pineapple Fruit Cake' },
                  { value: 'Rasmalai Royal Cake' },
                  { value: 'Custom Photo / Designer Cake' }
                ],
                shuffle: false
              }
            }
          }
        },
        location: { index: 2 }
      }
    },
    {
      createItem: {
        item: {
          title: 'Cake Weight / Size / ওজন',
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: 'RADIO',
                options: [
                  { value: '0.5 lb (250g)' },
                  { value: '1.0 lb (450g)' },
                  { value: '1.5 lb (700g)' },
                  { value: '2.0 lb (1 kg)' },
                  { value: '3.0 lb (1.4 kg)' },
                  { value: '5.0 lb (Party Size)' }
                ],
                shuffle: false
              }
            }
          }
        },
        location: { index: 3 }
      }
    },
    {
      createItem: {
        item: {
          title: 'Delivery / Pickup Date / ডেলিভারি তারিখ',
          description: 'Enter your preferred date (e.g. YYYY-MM-DD)',
          questionItem: {
            question: {
              required: true,
              textQuestion: { paragraph: false }
            }
          }
        },
        location: { index: 4 }
      }
    },
    {
      createItem: {
        item: {
          title: 'Message to write on Cake / কেকের ওপর লেখার নাম বা মেসেজ',
          description: 'e.g. Happy Birthday Riya / Happy Anniversary',
          questionItem: {
            question: {
              required: false,
              textQuestion: { paragraph: false }
            }
          }
        },
        location: { index: 5 }
      }
    },
    {
      createItem: {
        item: {
          title: 'Special Instructions & Design Notes',
          description: '100% Eggless guaranteed. Any special color or design requests?',
          questionItem: {
            question: {
              required: false,
              textQuestion: { paragraph: true }
            }
          }
        },
        location: { index: 6 }
      }
    }
  ];

  const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests: batchRequests })
  });

  if (!updateRes.ok) {
    console.warn('Form created but failed to populate some questions:', await updateRes.text());
  }

  // Fetch updated form to get responderUri
  const detailsRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const details = await detailsRes.json();

  return {
    formId,
    title: details.info?.title || `${shopName} Order Form`,
    description: details.info?.description,
    responderUri: details.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`
  };
}

/**
 * Fetches responses submitted to a Google Form and parses into orders
 */
export async function getGoogleFormResponses(
  accessToken: string,
  formId: string
): Promise<GoogleFormResponse[]> {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch form responses: ${err}`);
  }

  const data = await res.json();
  const rawResponses = data.responses || [];

  return rawResponses.map((r: any) => {
    const answers = r.answers || {};
    const values: string[] = [];
    Object.values(answers).forEach((ans: any) => {
      const textAnswers = ans.textAnswers?.answers || [];
      textAnswers.forEach((t: any) => {
        if (t.value) values.push(t.value);
      });
    });

    return {
      responseId: r.responseId,
      createTime: r.createTime,
      lastSubmittedTime: r.lastSubmittedTime,
      customerName: values[0] || 'Web Order',
      customerMobile: values[1] || '',
      cakeFlavor: values[2] || 'Chocolate Truffle Cake',
      weight: values[3] || '1.0 lb',
      deliveryDate: values[4] || '',
      cakeMessage: values[5] || '',
      notes: values[6] || ''
    };
  });
}
