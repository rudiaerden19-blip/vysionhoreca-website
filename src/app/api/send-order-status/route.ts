import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

interface OrderItem {
  name?: string
  product_name?: string
  quantity: number
  price?: number
  unit_price?: number
  total_price?: number
  options?: { name: string; price?: number }[]
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      customerEmail, 
      customerName,
      customerPhone,
      customerAddress,
      orderNumber, 
      orderType,
      status, 
      // Business info (verplicht voor Belgische wetgeving)
      businessName,
      businessEmail,
      businessPhone,
      businessAddress,
      businessPostalCode,
      businessCity,
      businessBtwNumber,
      // Order details
      items,
      subtotal,
      deliveryFee,
      discount,
      tax,
      total,
      btwPercentage,
      // Rejection
      rejectionReason,
      rejectionNotes,
    } = body

    if (!customerEmail || !orderNumber || !status || !businessName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD,
      },
    })

    let subject = ''
    let statusText = ''
    let statusColor = ''
    let statusEmoji = ''
    let additionalInfo = ''

    switch (status) {
      case 'confirmed':
        subject = `✅ Bestelling #${orderNumber} bevestigd - ${businessName}`
        statusText = 'Je bestelling is bevestigd en wordt nu bereid!'
        statusColor = '#22c55e'
        statusEmoji = '✅'
        break
      case 'ready':
        subject = `🎉 Bestelling #${orderNumber} is klaar! - ${businessName}`
        statusText = orderType === 'delivery' 
          ? 'Je bestelling is klaar en wordt bezorgd!'
          : 'Je bestelling is klaar om opgehaald te worden!'
        statusColor = '#22c55e'
        statusEmoji = '🎉'
        break
      case 'rejected':
        subject = `❌ Bestelling #${orderNumber} geannuleerd - ${businessName}`
        statusText = 'Helaas kunnen we je bestelling niet verwerken.'
        statusColor = '#ef4444'
        statusEmoji = '❌'
        if (rejectionReason) {
          const reasonLabels: Record<string, string> = {
            'too_busy': 'We zijn op dit moment te druk',
            'busy': 'We zijn op dit moment te druk',
            'closed': 'We zijn gesloten',
            'sold_out': 'Product(en) uitverkocht',
            'no_stock': 'Product(en) niet op voorraad',
            'delivery_unavailable': 'Levering niet beschikbaar voor dit adres',
            'technical': 'Technisch probleem',
            'address': 'Adres niet bezorgbaar',
            'other': 'Andere reden',
          }
          additionalInfo = `<p style="color: #666; margin-top: 15px;"><strong>Reden:</strong> ${reasonLabels[rejectionReason] || rejectionReason}</p>`
          if (rejectionNotes) {
            additionalInfo += `<p style="color: #666; font-style: italic;">${rejectionNotes}</p>`
          }
          additionalInfo += `<p style="color: #666; margin-top: 15px;">Je hebt niets betaald. Probeer het later opnieuw of neem contact op met de zaak.</p>`
        }
        break
      default:
        subject = `Bestelling #${orderNumber} update - ${businessName}`
        statusText = `Status: ${status}`
        statusColor = '#f97316'
        statusEmoji = '📦'
    }

    // Parse items if they're a string
    let orderItems: OrderItem[] = []
    if (items) {
      if (typeof items === 'string') {
        try {
          orderItems = JSON.parse(items)
        } catch (e) {
          orderItems = []
        }
      } else {
        orderItems = items
      }
    }

    // Calculate BTW (6% is standaard voor horeca in België)
    const btwRate = btwPercentage || 6
    const totalNum = parseFloat(total) || 0
    const totalExclBtw = totalNum / (1 + btwRate / 100)
    const btwAmount = totalNum - totalExclBtw

    // Build items HTML
    const itemsHtml = orderItems.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Aantal</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Prijs</th>
          </tr>
        </thead>
        <tbody>
          ${orderItems.map((item: OrderItem) => {
            const itemName = item.name || item.product_name || 'Product'
            const itemPrice = item.price || item.unit_price || 0
            const itemTotal = item.total_price || (itemPrice * item.quantity)
            const optionsHtml = item.options?.map(opt => 
              `<br><span style="color: #666; font-size: 12px;">+ ${opt.name}${opt.price ? ` (€${opt.price.toFixed(2)})` : ''}</span>`
            ).join('') || ''
            const notesHtml = item.notes ? `<br><span style="color: #888; font-size: 12px; font-style: italic;">📝 ${item.notes}</span>` : ''
            
            return `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                  <strong>${itemName}</strong>${optionsHtml}${notesHtml}
                </td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}x</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">€${itemTotal.toFixed(2)}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    ` : ''

    // Build totals HTML
    const totalsHtml = `
      <table style="width: 100%; margin-top: 15px;">
        ${subtotal ? `
          <tr>
            <td style="padding: 5px 0; color: #666;">Subtotaal</td>
            <td style="padding: 5px 0; text-align: right;">€${parseFloat(subtotal).toFixed(2)}</td>
          </tr>
        ` : ''}
        ${deliveryFee && parseFloat(deliveryFee) > 0 ? `
          <tr>
            <td style="padding: 5px 0; color: #666;">Bezorgkosten</td>
            <td style="padding: 5px 0; text-align: right;">€${parseFloat(deliveryFee).toFixed(2)}</td>
          </tr>
        ` : ''}
        ${discount && parseFloat(discount) > 0 ? `
          <tr>
            <td style="padding: 5px 0; color: #22c55e;">Korting</td>
            <td style="padding: 5px 0; text-align: right; color: #22c55e;">-€${parseFloat(discount).toFixed(2)}</td>
          </tr>
        ` : ''}
        <tr style="border-top: 1px solid #ddd;">
          <td style="padding: 8px 0; color: #666;">Totaal excl. BTW</td>
          <td style="padding: 8px 0; text-align: right;">€${totalExclBtw.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #666;">BTW ${btwRate}%</td>
          <td style="padding: 5px 0; text-align: right;">€${btwAmount.toFixed(2)}</td>
        </tr>
        <tr style="border-top: 2px solid #333;">
          <td style="padding: 10px 0; font-size: 18px;"><strong>TOTAAL incl. BTW</strong></td>
          <td style="padding: 10px 0; text-align: right; font-size: 18px;"><strong>€${totalNum.toFixed(2)}</strong></td>
        </tr>
      </table>
    `

    // Customer info HTML
    const customerInfoHtml = `
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="margin: 0 0 10px; color: #0369a1; font-size: 14px;">👤 Klantgegevens</h3>
        <p style="margin: 5px 0; color: #333;"><strong>${customerName || 'Klant'}</strong></p>
        ${customerPhone ? `<p style="margin: 5px 0; color: #666;">📞 ${customerPhone}</p>` : ''}
        ${customerEmail ? `<p style="margin: 5px 0; color: #666;">✉️ ${customerEmail}</p>` : ''}
        ${customerAddress ? `<p style="margin: 5px 0; color: #666;">📍 ${customerAddress}</p>` : ''}
        <p style="margin: 10px 0 0; padding-top: 10px; border-top: 1px solid #bae6fd; color: #0369a1; font-weight: bold;">
          ${orderType === 'delivery' ? '🚗 Levering' : '🛍️ Afhalen'}
        </p>
      </div>
    `

    // Business info HTML (VERPLICHT voor Belgische wetgeving)
    const businessInfoHtml = `
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #e5e5e5;">
        <h3 style="margin: 0 0 10px; color: #333; font-size: 14px;">🏪 Bedrijfsgegevens</h3>
        <p style="margin: 5px 0; color: #333;"><strong>${businessName}</strong></p>
        ${businessAddress ? `<p style="margin: 5px 0; color: #666;">${businessAddress}</p>` : ''}
        ${businessPostalCode || businessCity ? `<p style="margin: 5px 0; color: #666;">${businessPostalCode || ''} ${businessCity || ''}</p>` : ''}
        ${businessPhone ? `<p style="margin: 5px 0; color: #666;">📞 ${businessPhone}</p>` : ''}
        ${businessEmail ? `<p style="margin: 5px 0; color: #666;">✉️ ${businessEmail}</p>` : ''}
        ${businessBtwNumber ? `<p style="margin: 10px 0 0; color: #333; font-weight: bold;">BTW: ${businessBtwNumber}</p>` : ''}
      </div>
    `

    const mailOptions = {
      from: `"${businessName}" <${process.env.ZOHO_EMAIL}>`,
      to: customerEmail,
      replyTo: businessEmail || process.env.ZOHO_EMAIL,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="text-align: center; padding: 30px; background: ${statusColor}; border-radius: 16px 16px 0 0;">
            <span style="font-size: 64px;">${statusEmoji}</span>
            <h1 style="color: white; margin: 20px 0 10px; font-size: 28px;">Bestelling #${orderNumber}</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 0;">${statusText}</p>
          </div>
          
          <!-- Content -->
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Beste ${customerName || 'klant'},</p>
            
            ${additionalInfo}
            
            ${status !== 'rejected' ? `
              <!-- Customer Info -->
              ${customerInfoHtml}
              
              <!-- Order Items -->
              ${orderItems.length > 0 ? `
                <div style="margin: 20px 0;">
                  <h3 style="margin: 0 0 10px; color: #333; font-size: 14px;">🧾 Bestelde producten</h3>
                  ${itemsHtml}
                </div>
              ` : ''}
              
              <!-- Totals -->
              <div style="background: #fafafa; padding: 15px; border-radius: 8px; border: 1px solid #e5e5e5;">
                ${totalsHtml}
              </div>
            ` : ''}
            
            <!-- Business Info (VERPLICHT) -->
            ${businessInfoHtml}
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Vragen over je bestelling? Neem contact op met ${businessName}${businessPhone ? ` via ${businessPhone}` : ''}.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 16px 16px; border: 1px solid #e5e5e5; border-top: none; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Dit is een automatische bevestiging van je bestelling.<br>
              Bewaar deze e-mail als aankoopbewijs.
            </p>
            <p style="color: #999; font-size: 11px; margin: 15px 0 0;">
              Powered by <a href="https://vysionhoreca.com" style="color: #f97316; text-decoration: none;">Vysion Horeca</a>
            </p>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order status email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
